import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';

/// Écran de configuration de l'adresse du backend.
///
/// Indispensable pour une app installée hors magasin (sideload) : l'URL de
/// l'API dépend du réseau (IP locale du PC, tunnel…) et ne peut pas être gravée
/// dans le binaire. Accessible depuis l'écran de connexion et l'onglet « Plus ».
class ApiSettingsScreen extends ConsumerStatefulWidget {
  const ApiSettingsScreen({super.key});

  @override
  ConsumerState<ApiSettingsScreen> createState() => _ApiSettingsScreenState();
}

class _ApiSettingsScreenState extends ConsumerState<ApiSettingsScreen> {
  late final TextEditingController _ctrl;
  bool _testing = false;
  ({bool ok, String message})? _testResult;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: ref.read(apiBaseUrlProvider));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  /// Teste l'URL saisie sans l'enregistrer : un simple GET sur `/health`.
  Future<void> _test() async {
    FocusScope.of(context).unfocus();
    final url = normalizeApiBaseUrl(_ctrl.text);
    setState(() {
      _testing = true;
      _testResult = null;
    });
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 8),
      ));
      final res = await dio.get('$url/health');
      final ok = res.statusCode == 200;
      setState(() => _testResult = (
            ok: ok,
            message: ok
                ? 'Connexion réussie au backend.'
                : 'Réponse inattendue (code ${res.statusCode}).',
          ));
    } on DioException catch (e) {
      setState(
          () => _testResult = (ok: false, message: 'Injoignable : ${_reason(e)}'));
    } catch (_) {
      setState(() => _testResult = (ok: false, message: 'Échec du test.'));
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  String _reason(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return 'délai dépassé.';
      case DioExceptionType.connectionError:
        return 'connexion impossible (vérifie l\'IP, le même réseau, le pare-feu).';
      case DioExceptionType.badResponse:
        return 'code ${e.response?.statusCode}.';
      default:
        return 'erreur réseau.';
    }
  }

  Future<void> _save() async {
    await ref.read(apiBaseUrlProvider.notifier).set(_ctrl.text);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Adresse du serveur enregistrée.')),
    );
    context.pop();
  }

  Future<void> _reset() async {
    await ref.read(apiBaseUrlProvider.notifier).resetToDefault();
    if (!mounted) return;
    _ctrl.text = ref.read(apiBaseUrlProvider);
    setState(() => _testResult = null);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Serveur / API',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Adresse du backend',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          const Text(
            'Saisis l\'URL de l\'API, terminée par « /api ». Sur un téléphone '
            'réel, utilise l\'IP locale du PC qui héberge le backend (pas '
            'localhost), le téléphone devant être sur le même réseau. '
            'Ex. : http://192.168.1.20:3001/api',
            style: TextStyle(color: AppColors.textSecondary, height: 1.4),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _ctrl,
            keyboardType: TextInputType.url,
            autocorrect: false,
            decoration: const InputDecoration(
              labelText: 'URL de l\'API',
              hintText: 'http://192.168.1.20:3001/api',
              prefixIcon: Icon(Icons.dns_outlined),
            ),
          ),
          const SizedBox(height: 12),
          if (_testResult != null) ...[
            _TestBanner(result: _testResult!),
            const SizedBox(height: 12),
          ],
          OutlinedButton.icon(
            onPressed: _testing ? null : _test,
            icon: _testing
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.wifi_tethering),
            label: Text(_testing ? 'Test en cours…' : 'Tester la connexion'),
          ),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: _save,
            icon: const Icon(Icons.save_outlined),
            label: const Text('Enregistrer'),
          ),
          const SizedBox(height: 4),
          TextButton(
            onPressed: _reset,
            child: const Text('Réinitialiser par défaut'),
          ),
        ],
      ),
    );
  }
}

/// Bandeau de résultat du test de connexion (vert = OK, rouge = échec).
class _TestBanner extends StatelessWidget {
  const _TestBanner({required this.result});

  final ({bool ok, String message}) result;

  @override
  Widget build(BuildContext context) {
    final color = result.ok ? AppColors.success : AppColors.error;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Icon(result.ok ? Icons.check_circle_outline : Icons.error_outline,
              color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              result.message,
              style: TextStyle(color: color, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
