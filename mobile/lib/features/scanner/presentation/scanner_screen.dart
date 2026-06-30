import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../inventory/domain/inventory_models.dart';
import '../../inventory/presentation/add_product_sheet.dart';
import '../data/scan_repository.dart';
import '../domain/scan_models.dart';

/// Code-barre produit valide : 6 à 14 chiffres (EAN-8/13, UPC-A/E). Le backend
/// applique la même validation avant d'interroger Open Food Facts.
final _barcodePattern = RegExp(r'^\d{6,14}$');

/// Formats scannés : codes-barres produits uniquement (on ignore les QR codes).
const _productFormats = [
  BarcodeFormat.ean13,
  BarcodeFormat.ean8,
  BarcodeFormat.upcA,
  BarcodeFormat.upcE,
];

/// État de la permission caméra tel que résolu au montage de l'écran.
enum _CameraPermission { checking, granted, denied, permanentlyDenied }

/// Écran de scan code-barre plein écran, poussé depuis le bouton central de la
/// barre d'onglets. La caméra démarre à l'ouverture et est libérée à la
/// fermeture ou en arrière-plan.
///
/// Flux : viser un code-barre → recherche Open Food Facts → formulaire d'ajout
/// pré-rempli. La saisie manuelle reste toujours accessible (repli si la caméra
/// est indisponible, refusée, ou si le produit est absent d'Open Food Facts).
class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key});

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends ConsumerState<ScannerScreen>
    with WidgetsBindingObserver {
  MobileScannerController? _controller;
  _CameraPermission _permission = _CameraPermission.checking;

  /// Vrai dès qu'un code est en cours de traitement (lookup + formulaire) :
  /// neutralise les détections en rafale émises par la caméra.
  bool _handling = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _resolvePermission();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_controller?.dispose());
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _controller;
    if (controller == null || _permission != _CameraPermission.granted) return;
    // Pendant le traitement d'un code (formulaire ouvert), la caméra est
    // volontairement à l'arrêt : ne pas la relancer sur un retour au premier
    // plan tant que l'utilisateur n'est pas revenu au scan.
    if (_handling) return;
    switch (state) {
      case AppLifecycleState.resumed:
        unawaited(controller.start());
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
      case AppLifecycleState.detached:
        unawaited(controller.stop());
    }
  }

  MobileScannerController _newController() =>
      MobileScannerController(formats: _productFormats);

  /// Résout la permission caméra au montage : demande l'autorisation si elle
  /// n'a jamais été accordée, puis bascule l'écran dans l'état correspondant.
  Future<void> _resolvePermission() async {
    var status = await Permission.camera.status;
    if (status.isDenied) {
      status = await Permission.camera.request();
    }
    if (!mounted) return;
    _applyPermissionStatus(status);
  }

  /// Re-demande la permission (bouton « Autoriser la caméra »).
  Future<void> _requestPermission() async {
    final status = await Permission.camera.request();
    if (!mounted) return;
    _applyPermissionStatus(status);
  }

  void _applyPermissionStatus(PermissionStatus status) {
    setState(() {
      if (status.isGranted || status.isLimited) {
        _permission = _CameraPermission.granted;
        _controller ??= _newController();
      } else if (status.isPermanentlyDenied || status.isRestricted) {
        _permission = _CameraPermission.permanentlyDenied;
      } else {
        _permission = _CameraPermission.denied;
      }
    });
  }

  /// Détection caméra : on retient le premier code-barre numérique valide.
  void _onDetect(BarcodeCapture capture) {
    if (_handling) return;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue?.trim();
      if (value != null && _barcodePattern.hasMatch(value)) {
        unawaited(_processBarcode(value, haptic: true));
        return;
      }
    }
  }

  /// Saisie manuelle d'un code-barre (repli si la caméra n'aboutit pas).
  Future<void> _enterManually() async {
    final code = await showDialog<String>(
      context: context,
      builder: (_) => const _ManualBarcodeDialog(),
    );
    if (!mounted || code == null) return;
    await _processBarcode(code, haptic: false);
  }

  /// Cœur du flux : recherche Open Food Facts puis ouverture du formulaire
  /// d'ajout pré-rempli. À l'ajout effectif, on quitte le scanner ; sinon on
  /// reprend le scan.
  Future<void> _processBarcode(String code, {required bool haptic}) async {
    setState(() => _handling = true);
    unawaited(_controller?.stop());
    if (haptic) unawaited(HapticFeedback.mediumImpact());

    BarcodeLookup? lookup;
    try {
      lookup = await ref.read(scanRepositoryProvider).lookupBarcode(code);
    } on ScanException catch (e) {
      if (!mounted) return;
      _toast(e.message);
      await _resumeScanning();
      return;
    } catch (_) {
      if (!mounted) return;
      _toast('Recherche impossible. Réessaie ou saisis le code manuellement.');
      await _resumeScanning();
      return;
    }

    if (!mounted) return;

    final ProductPrefill prefill;
    if (lookup != null && lookup.hasName) {
      prefill =
          ProductPrefill(name: lookup.name, brand: lookup.brand, barcode: code);
    } else {
      prefill = ProductPrefill(barcode: code);
      _toast("Produit inconnu d'Open Food Facts. Complète les infos.");
    }

    final added = await showAddProductSheet(context, prefill: prefill);
    if (!mounted) return;
    if (added) {
      context.pop();
    } else {
      await _resumeScanning();
    }
  }

  Future<void> _resumeScanning() async {
    if (!mounted) return;
    setState(() => _handling = false);
    try {
      await _controller?.start();
    } catch (_) {
      // La caméra peut refuser de redémarrer (ex. ressource occupée) : la
      // saisie manuelle reste disponible, inutile de remonter l'erreur.
    }
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Scanner',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          if (_permission == _CameraPermission.granted && controller != null)
            _TorchButton(controller: controller),
        ],
      ),
      body: switch (_permission) {
        _CameraPermission.checking => const Center(
            child: CircularProgressIndicator(color: Colors.white),
          ),
        _CameraPermission.granted => _buildScanner(controller!),
        _CameraPermission.denied => _PermissionMessage(
            permanent: false,
            onPrimary: _requestPermission,
            onManual: _enterManually,
          ),
        _CameraPermission.permanentlyDenied => _PermissionMessage(
            permanent: true,
            onPrimary: openAppSettings,
            onManual: _enterManually,
          ),
      },
    );
  }

  Widget _buildScanner(MobileScannerController controller) {
    return Stack(
      fit: StackFit.expand,
      children: [
        MobileScanner(
          controller: controller,
          onDetect: _onDetect,
          errorBuilder: (context, error) => _CameraError(
            error: error,
            onManual: _enterManually,
          ),
        ),
        _ScannerOverlay(handling: _handling),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: _ManualEntryBar(
            onManual: _handling ? null : _enterManually,
          ),
        ),
      ],
    );
  }
}

/// Cadre de visée + voile « recherche en cours », superposés à la caméra.
class _ScannerOverlay extends StatelessWidget {
  const _ScannerOverlay({required this.handling});

  final bool handling;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Stack(
        fit: StackFit.expand,
        children: [
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Vise le code-barre du produit',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    shadows: [Shadow(color: Colors.black54, blurRadius: 8)],
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  width: 270,
                  height: 170,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.9),
                      width: 3,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'EAN-13, EAN-8, UPC',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    shadows: [Shadow(color: Colors.black54, blurRadius: 8)],
                  ),
                ),
              ],
            ),
          ),
          if (handling)
            const ColoredBox(
              color: Colors.black54,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text(
                      'Recherche du produit…',
                      style: TextStyle(color: Colors.white, fontSize: 15),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Barre basse avec le repli « saisie manuelle », toujours présent sous la
/// caméra.
class _ManualEntryBar extends StatelessWidget {
  const _ManualEntryBar({required this.onManual});

  final VoidCallback? onManual;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
          20, 16, 20, 16 + MediaQuery.of(context).padding.bottom),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.transparent, Colors.black87],
        ),
      ),
      child: OutlinedButton.icon(
        onPressed: onManual,
        icon: const Icon(Icons.keyboard),
        label: const Text('Saisir le code manuellement'),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: const BorderSide(color: Colors.white70),
          padding: const EdgeInsets.symmetric(vertical: 14),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

/// Bouton lampe torche, affiché seulement si l'appareil en dispose.
class _TorchButton extends StatelessWidget {
  const _TorchButton({required this.controller});

  final MobileScannerController controller;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<MobileScannerState>(
      valueListenable: controller,
      builder: (context, state, _) {
        if (state.torchState == TorchState.unavailable) {
          return const SizedBox.shrink();
        }
        final on = state.torchState == TorchState.on;
        return IconButton(
          tooltip: on ? 'Éteindre la lampe' : 'Allumer la lampe',
          icon: Icon(on ? Icons.flash_on : Icons.flash_off),
          onPressed: () => unawaited(controller.toggleTorch()),
        );
      },
    );
  }
}

/// Message affiché lorsque mobile_scanner signale une erreur caméra interne.
class _CameraError extends StatelessWidget {
  const _CameraError({required this.error, required this.onManual});

  final MobileScannerException error;
  final VoidCallback onManual;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.videocam_off_outlined,
                  size: 64, color: Colors.white70),
              const SizedBox(height: 16),
              const Text(
                'Caméra indisponible',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Impossible de démarrer la caméra. Tu peux saisir le code-barre '
                'manuellement.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onManual,
                icon: const Icon(Icons.keyboard),
                label: const Text('Saisir le code manuellement'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Écran affiché quand la permission caméra est refusée (SCAN-5). [permanent]
/// distingue un refus simple (re-demande possible) d'un blocage définitif
/// (réglages système).
class _PermissionMessage extends StatelessWidget {
  const _PermissionMessage({
    required this.permanent,
    required this.onPrimary,
    required this.onManual,
  });

  final bool permanent;
  final VoidCallback onPrimary;
  final VoidCallback onManual;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.no_photography_outlined,
                size: 64, color: Colors.white70),
            const SizedBox(height: 16),
            Text(
              permanent ? 'Accès caméra bloqué' : 'Caméra non autorisée',
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              permanent
                  ? "Autorise la caméra dans les réglages de l'application pour "
                      'scanner un code-barre.'
                  : 'MySmartFridge a besoin de la caméra pour scanner les '
                      'codes-barres de tes produits.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onPrimary,
              icon: Icon(permanent ? Icons.settings : Icons.camera_alt),
              label: Text(
                  permanent ? 'Ouvrir les réglages' : 'Autoriser la caméra'),
            ),
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: onManual,
              icon: const Icon(Icons.keyboard, color: Colors.white),
              label: const Text('Saisir le code manuellement',
                  style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}

/// Boîte de dialogue de saisie manuelle d'un code-barre (SCAN-3).
class _ManualBarcodeDialog extends StatefulWidget {
  const _ManualBarcodeDialog();

  @override
  State<_ManualBarcodeDialog> createState() => _ManualBarcodeDialogState();
}

class _ManualBarcodeDialogState extends State<_ManualBarcodeDialog> {
  final _formKey = GlobalKey<FormState>();
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.of(context).pop(_controller.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Saisir un code-barre'),
      content: Form(
        key: _formKey,
        child: TextFormField(
          controller: _controller,
          autofocus: true,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(
            labelText: 'Code-barre',
            hintText: '13 chiffres (EAN-13)',
            prefixIcon: Icon(Icons.qr_code),
          ),
          validator: (v) {
            final s = v?.trim() ?? '';
            if (s.isEmpty) return 'Saisis un code-barre';
            if (!_barcodePattern.hasMatch(s)) return 'Entre 6 et 14 chiffres';
            return null;
          },
          onFieldSubmitted: (_) => _submit(),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: _submit,
          child: const Text('Rechercher'),
        ),
      ],
    );
  }
}
