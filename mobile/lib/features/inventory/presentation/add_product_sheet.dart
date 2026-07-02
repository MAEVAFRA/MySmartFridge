import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/async_state_views.dart';
import '../../home/dashboard_provider.dart';
import '../../scanner/data/scan_repository.dart';
import '../application/inventory_providers.dart';
import '../data/inventory_repository.dart';
import '../domain/inventory_models.dart';
import 'product_image.dart';

/// Unités proposées dans le formulaire (l'API stocke une simple chaîne).
const _units = ['pièce', 'g', 'kg', 'mL', 'L', 'paquet', 'boîte', 'tranche'];

/// Ouvre le formulaire d'ajout de produit dans une bottom sheet.
///
/// [prefill] pré-remplit le nom / la marque / le code-barre — typiquement après
/// un scan code-barre (SCAN-4). Retourne `true` si un produit a été créé.
Future<bool> showAddProductSheet(
  BuildContext context, {
  ProductPrefill? prefill,
}) {
  return _showProductSheet(context, prefill: prefill);
}

/// Ouvre le formulaire d'édition d'un produit existant (INV-7), pré-rempli avec
/// ses valeurs actuelles. Retourne `true` si le produit a été modifié.
Future<bool> showEditProductSheet(
  BuildContext context, {
  required Product product,
}) {
  return _showProductSheet(context, editing: product);
}

Future<bool> _showProductSheet(
  BuildContext context, {
  ProductPrefill? prefill,
  Product? editing,
}) async {
  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _ProductSheet(prefill: prefill, editing: editing),
  );
  return saved ?? false;
}

/// Formulaire produit partagé entre l'ajout et l'édition. En mode édition
/// ([editing] non nul), les champs sont pré-remplis et l'enregistrement fait un
/// `PUT` ; sinon un `POST` de création.
class _ProductSheet extends ConsumerStatefulWidget {
  const _ProductSheet({this.prefill, this.editing});

  final ProductPrefill? prefill;
  final Product? editing;

  @override
  ConsumerState<_ProductSheet> createState() => _ProductSheetState();
}

class _ProductSheetState extends ConsumerState<_ProductSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _nameController = TextEditingController(
      text: widget.editing?.name ?? widget.prefill?.name ?? '');
  late final _brandController = TextEditingController(
      text: widget.editing?.brand ?? widget.prefill?.brand ?? '');
  late final _quantityController =
      TextEditingController(text: _initialQuantityText());
  late final _barcodeController = TextEditingController(
      text: widget.editing?.barcode ?? widget.prefill?.barcode ?? '');
  late final _notesController =
      TextEditingController(text: widget.editing?.notes ?? '');

  String? _locationId;
  String? _categoryId;
  late String _unit;
  DateTime? _expiresAt;
  String? _imageUrl;
  // Vrai dès que l'utilisateur ajoute/retire une photo : en édition, on ne
  // sérialise `image_url` que dans ce cas (sinon on préserve la photo existante).
  bool _imageChanged = false;
  bool _submitting = false;
  bool _lookingUp = false;

  bool get _isEditing => widget.editing != null;

  @override
  void initState() {
    super.initState();
    final editing = widget.editing;
    _locationId = editing?.locationId;
    _categoryId = editing?.categoryId;
    _expiresAt = editing?.expiresAt;
    _imageUrl = editing?.imageUrl ?? widget.prefill?.imageUrl;
    final unit = editing?.unit;
    _unit = (unit != null && unit.isNotEmpty) ? unit : 'pièce';
  }

  /// Quantité initiale : celle du produit édité (sans décimale superflue),
  /// sinon « 1 » par défaut à la création.
  String _initialQuantityText() {
    final q = widget.editing?.quantity;
    if (q == null) return _isEditing ? '' : '1';
    return q % 1 == 0 ? q.toInt().toString() : q.toString();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _brandController.dispose();
    _quantityController.dispose();
    _barcodeController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    // À défaut de date saisie, on ouvre le sélecteur sur la date estimée depuis
    // la catégorie (INV-9), sinon sur J+7.
    var initial = _expiresAt ?? now.add(const Duration(days: 7));
    if (_expiresAt == null) {
      final estimated = _estimatedExpiry();
      if (estimated != null) initial = estimated;
    }
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 10),
      helpText: 'Date de péremption',
    );
    if (picked != null) setState(() => _expiresAt = picked);
  }

  /// Date de péremption estimée à partir de la catégorie et de l'emplacement
  /// sélectionnés (INV-9), ou `null` si indisponible. Sert d'aperçu et de valeur
  /// initiale du sélecteur ; l'estimation définitive reste faite côté serveur.
  DateTime? _estimatedExpiry() {
    final data = ref.read(addProductFormDataProvider).asData?.value;
    if (data == null) return null;
    final category = _categoryById(data.categories, _categoryId);
    if (category == null) return null;
    return estimateExpiryDate(
        category, _locationTypeById(data.locations, _locationId));
  }

  /// Propose caméra/galerie puis récupère une photo compressée (INV-10).
  Future<void> _pickImage() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Prendre une photo'),
              onTap: () => Navigator.of(context).pop(ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choisir dans la galerie'),
              onTap: () => Navigator.of(context).pop(ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      final dataUrl = await pickProductImageDataUrl(source);
      if (dataUrl == null || !mounted) return;
      setState(() {
        _imageUrl = dataUrl;
        _imageChanged = true;
      });
    } catch (_) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text(
              'Impossible d\'accéder à la photo. Vérifie les autorisations.'),
        ),
      );
    }
  }

  void _removeImage() => setState(() {
        _imageUrl = null;
        _imageChanged = true;
      });

  /// Recherche le code-barre saisi via Open Food Facts (INV-11) et pré-remplit
  /// nom / marque / photo. Complète le scan caméra (SCAN-4) pour une saisie
  /// manuelle du code depuis le formulaire.
  Future<void> _lookupBarcode() async {
    final code = _barcodeController.text.trim();
    final messenger = ScaffoldMessenger.of(context);
    if (code.isEmpty) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Saisis un code-barres à rechercher.')),
      );
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() => _lookingUp = true);
    try {
      final result = await ref.read(scanRepositoryProvider).lookupBarcode(code);
      if (!mounted) return;
      if (result == null) {
        messenger.showSnackBar(
          const SnackBar(
              content: Text('Aucun produit trouvé pour ce code-barres.')),
        );
        return;
      }
      setState(() {
        if (result.hasName) _nameController.text = result.name;
        if (result.brand != null) _brandController.text = result.brand!;
        // On ne remplace pas une photo déjà choisie par l'utilisateur.
        if ((_imageUrl == null || _imageUrl!.isEmpty) &&
            result.imageUrl != null) {
          _imageUrl = result.imageUrl;
          _imageChanged = true;
        }
      });
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            result.hasName ? '« ${result.name} » trouvé' : 'Produit trouvé',
          ),
        ),
      );
    } on ScanException catch (e) {
      if (mounted) {
        messenger.showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _lookingUp = false);
    }
  }

  Future<void> _submit() async {
    final locationId = _locationId;
    if (!_formKey.currentState!.validate() || locationId == null) return;

    setState(() => _submitting = true);
    final name = _nameController.text.trim();
    final brand = _brandController.text.trim();
    final quantity =
        num.tryParse(_quantityController.text.trim().replaceAll(',', '.'));
    final barcode = _barcodeController.text.trim();
    final notes = _notesController.text.trim();

    final input = ProductInput(
      name: name,
      locationId: locationId,
      categoryId: _categoryId,
      quantity: quantity,
      unit: _unit,
      expiresAt: _expiresAt,
      barcode: barcode.isEmpty ? null : barcode,
      brand: brand.isEmpty ? null : brand,
      notes: notes.isEmpty ? null : notes,
      imageUrl: _imageUrl,
      includeImage: _imageChanged,
    );

    // Le messenger est capturé avant le pop : après fermeture de la sheet, son
    // `context` est démonté et ne permettrait plus de retrouver le ScaffoldMessenger.
    final messenger = ScaffoldMessenger.of(context);
    final editing = widget.editing;
    try {
      final repo = ref.read(inventoryRepositoryProvider);
      if (editing != null) {
        await repo.updateProduct(editing.id, input);
        ref.invalidate(productDetailProvider(editing.id));
      } else {
        await repo.createProduct(input);
      }
      ref.invalidate(inventoryProvider);
      ref.invalidate(dashboardProvider);
      if (!mounted) return;
      Navigator.of(context).pop(true);
      messenger.showSnackBar(
        SnackBar(
          content:
              Text(editing != null ? '« $name » modifié' : '« $name » ajouté'),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            editing != null
                ? 'Échec de la modification. Vérifie ta connexion et réessaie.'
                : 'Échec de l\'ajout. Vérifie ta connexion et réessaie.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final formData = ref.watch(addProductFormDataProvider);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: formData.when(
          loading: () => const SizedBox(height: 260, child: LoadingView()),
          error: (_, _) => SizedBox(
            height: 260,
            child: ErrorRetryView(
              title: 'Impossible de charger le formulaire',
              onRetry: () => ref.invalidate(addProductFormDataProvider),
            ),
          ),
          data: _buildForm,
        ),
      ),
    );
  }

  Widget _buildForm(AddProductFormData data) {
    // Emplacement par défaut (création) : le premier de la liste.
    _locationId ??= data.locations.isNotEmpty ? data.locations.first.id : null;

    // L'unité d'un produit édité peut ne pas figurer dans la liste par défaut
    // (ex. produit créé côté web avec « unité ») : on l'ajoute en tête pour
    // éviter un Dropdown dont la valeur ne correspond à aucune option.
    final unitOptions = _units.contains(_unit) ? _units : [_unit, ..._units];

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 12),
        Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(
            color: AppColors.border,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              _isEditing ? 'Modifier le produit' : 'Ajouter un produit',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        Flexible(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: _PhotoField(
                      imageUrl: _imageUrl,
                      onPick: _pickImage,
                      onRemove: _removeImage,
                    ),
                  ),
                  const SizedBox(height: 18),
                  TextFormField(
                    controller: _nameController,
                    textCapitalization: TextCapitalization.sentences,
                    // Pas d'autofocus en édition ni si le nom est déjà rempli
                    // (scan) : on évite d'ouvrir le clavier par-dessus le form.
                    autofocus:
                        !_isEditing && (widget.prefill?.name ?? '').isEmpty,
                    decoration: const InputDecoration(
                      labelText: 'Nom *',
                      hintText: 'Ex. Tomates',
                      prefixIcon: Icon(Icons.label_outline),
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Le nom est obligatoire'
                        : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _brandController,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: const InputDecoration(
                      labelText: 'Marque (optionnel)',
                      hintText: 'Ex. Bonduelle',
                      prefixIcon: Icon(Icons.sell_outlined),
                    ),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    initialValue: _locationId,
                    decoration: const InputDecoration(
                      labelText: 'Emplacement *',
                      prefixIcon: Icon(Icons.place_outlined),
                    ),
                    items: [
                      for (final loc in data.locations)
                        DropdownMenuItem(
                          value: loc.id,
                          child: Text(
                            loc.icon != null
                                ? '${loc.icon}  ${loc.name}'
                                : loc.name,
                          ),
                        ),
                    ],
                    onChanged: (v) => setState(() => _locationId = v),
                    validator: (v) =>
                        v == null ? 'Choisis un emplacement' : null,
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String?>(
                    initialValue: _categoryId,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Catégorie',
                      prefixIcon: Icon(Icons.category_outlined),
                    ),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('Aucune')),
                      for (final cat in data.categories)
                        DropdownMenuItem(
                          value: cat.id,
                          child: Text(
                            cat.icon != null
                                ? '${cat.icon}  ${cat.name}'
                                : cat.name,
                          ),
                        ),
                    ],
                    onChanged: (v) => setState(() => _categoryId = v),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _quantityController,
                          keyboardType: const TextInputType.numberWithOptions(
                              decimal: true),
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                                RegExp(r'[0-9.,]')),
                          ],
                          decoration: const InputDecoration(
                            labelText: 'Quantité',
                            prefixIcon: Icon(Icons.numbers),
                          ),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) return null;
                            return num.tryParse(
                                        v.trim().replaceAll(',', '.')) ==
                                    null
                                ? 'Nombre invalide'
                                : null;
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _unit,
                          decoration: const InputDecoration(labelText: 'Unité'),
                          items: [
                            for (final u in unitOptions)
                              DropdownMenuItem(value: u, child: Text(u)),
                          ],
                          onChanged: (v) => setState(() => _unit = v ?? _unit),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _DateField(
                    date: _expiresAt,
                    estimatedDate:
                        _expiresAt == null ? _estimatedExpiry() : null,
                    onTap: _pickDate,
                    onClear: () => setState(() => _expiresAt = null),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _barcodeController,
                    keyboardType: TextInputType.number,
                    textInputAction: TextInputAction.search,
                    onFieldSubmitted: (_) => _lookupBarcode(),
                    decoration: InputDecoration(
                      labelText: 'Code-barres (optionnel)',
                      helperText: 'Recherche le produit sur Open Food Facts',
                      prefixIcon: const Icon(Icons.qr_code),
                      suffixIcon: _lookingUp
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            )
                          : IconButton(
                              icon: const Icon(Icons.search),
                              tooltip: 'Rechercher via le code-barres',
                              onPressed: _lookupBarcode,
                            ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _notesController,
                    textCapitalization: TextCapitalization.sentences,
                    minLines: 1,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Notes (optionnel)',
                      hintText: 'Ex. entamé, pour la recette de samedi…',
                      prefixIcon: Icon(Icons.notes_outlined),
                      alignLabelWithHint: true,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(
              20, 8, 20, 16 + MediaQuery.of(context).padding.bottom),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _submitting ? null : _submit,
              icon: _submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : Icon(_isEditing ? Icons.save_outlined : Icons.check),
              label: Text(_submitLabel),
            ),
          ),
        ),
      ],
    );
  }

  String get _submitLabel {
    if (_isEditing) return _submitting ? 'Enregistrement…' : 'Enregistrer';
    return _submitting ? 'Ajout…' : 'Ajouter';
  }
}

/// Champ de sélection de la date de péremption (optionnel).
///
/// Si aucune date n'est saisie mais qu'une [estimatedDate] est disponible (via
/// la catégorie, INV-9), on l'affiche en aperçu : c'est la date qui sera
/// appliquée automatiquement par le serveur si l'utilisateur ne la modifie pas.
class _DateField extends StatelessWidget {
  const _DateField({
    required this.date,
    required this.estimatedDate,
    required this.onTap,
    required this.onClear,
  });

  final DateTime? date;
  final DateTime? estimatedDate;
  final VoidCallback onTap;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final String label;
    if (date != null) {
      label = DateFormat('dd/MM/yyyy').format(date!);
    } else if (estimatedDate != null) {
      label = 'Estimée : ${DateFormat('dd/MM/yyyy').format(estimatedDate!)}';
    } else {
      label = 'Aucune date';
    }
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: 'Date de péremption',
          prefixIcon: const Icon(Icons.event_outlined),
          helperText: date == null && estimatedDate != null
              ? 'Estimée depuis la catégorie — touchez pour ajuster'
              : null,
          suffixIcon: date != null
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: onClear,
                  tooltip: 'Effacer la date',
                )
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color:
                date != null ? AppColors.textPrimary : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

/// Sélecteur de photo du produit (INV-10) : vignette tactile (photo ou
/// invite « Photo »), avec actions « Changer » / « Retirer » une fois une photo
/// choisie.
class _PhotoField extends StatelessWidget {
  const _PhotoField({
    required this.imageUrl,
    required this.onPick,
    required this.onRemove,
  });

  final String? imageUrl;
  final VoidCallback onPick;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final hasImage = imageUrl != null && imageUrl!.isNotEmpty;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        InkWell(
          onTap: onPick,
          borderRadius: BorderRadius.circular(16),
          child: hasImage
              ? ProductThumb(imageUrl: imageUrl, size: 104, radius: 16)
              : Container(
                  width: 104,
                  height: 104,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add_a_photo_outlined,
                          color: AppColors.primary),
                      SizedBox(height: 6),
                      Text('Photo',
                          style: TextStyle(
                              fontSize: 12, color: AppColors.primary)),
                    ],
                  ),
                ),
        ),
        if (hasImage)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextButton.icon(
                onPressed: onPick,
                icon: const Icon(Icons.edit_outlined, size: 16),
                label: const Text('Changer'),
              ),
              TextButton.icon(
                onPressed: onRemove,
                icon: const Icon(Icons.close, size: 16),
                label: const Text('Retirer'),
                style: TextButton.styleFrom(foregroundColor: AppColors.error),
              ),
            ],
          ),
      ],
    );
  }
}

/// Retrouve une catégorie par son id (ou `null`), sans dépendance externe.
Category? _categoryById(List<Category> categories, String? id) {
  if (id == null) return null;
  for (final c in categories) {
    if (c.id == id) return c;
  }
  return null;
}

/// Type de l'emplacement (`fridge`/`freezer`/…) par son id, ou `null`.
String? _locationTypeById(List<Location> locations, String? id) {
  if (id == null) return null;
  for (final l in locations) {
    if (l.id == id) return l.type;
  }
  return null;
}
