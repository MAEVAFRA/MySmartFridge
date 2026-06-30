import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/async_state_views.dart';
import '../application/inventory_providers.dart';
import '../data/inventory_repository.dart';
import '../domain/inventory_models.dart';

/// Unités proposées dans le formulaire (l'API stocke une simple chaîne).
const _units = ['pièce', 'g', 'kg', 'mL', 'L', 'paquet', 'boîte', 'tranche'];

/// Ouvre le formulaire d'ajout de produit dans une bottom sheet.
///
/// [prefill] pré-remplit le nom / la marque / le code-barre — typiquement après
/// un scan code-barre (SCAN-4). Retourne `true` si un produit a été créé.
Future<bool> showAddProductSheet(
  BuildContext context, {
  ProductPrefill? prefill,
}) async {
  final added = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _AddProductSheet(prefill: prefill),
  );
  return added ?? false;
}

class _AddProductSheet extends ConsumerStatefulWidget {
  const _AddProductSheet({this.prefill});

  final ProductPrefill? prefill;

  @override
  ConsumerState<_AddProductSheet> createState() => _AddProductSheetState();
}

class _AddProductSheetState extends ConsumerState<_AddProductSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _nameController =
      TextEditingController(text: widget.prefill?.name ?? '');
  late final _brandController =
      TextEditingController(text: widget.prefill?.brand ?? '');
  final _quantityController = TextEditingController(text: '1');
  late final _barcodeController =
      TextEditingController(text: widget.prefill?.barcode ?? '');

  String? _locationId;
  String? _categoryId;
  String _unit = 'pièce';
  DateTime? _expiresAt;
  bool _submitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _brandController.dispose();
    _quantityController.dispose();
    _barcodeController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiresAt ?? now.add(const Duration(days: 7)),
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 10),
      helpText: 'Date de péremption',
    );
    if (picked != null) setState(() => _expiresAt = picked);
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

    try {
      await ref.read(inventoryRepositoryProvider).createProduct(
            ProductInput(
              name: name,
              locationId: locationId,
              categoryId: _categoryId,
              quantity: quantity,
              unit: _unit,
              expiresAt: _expiresAt,
              barcode: barcode.isEmpty ? null : barcode,
              brand: brand.isEmpty ? null : brand,
            ),
          );
      ref.invalidate(inventoryProvider);
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('« $name » ajouté')),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Échec de l\'ajout. Vérifie ta connexion et réessaie.'),
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
    // Emplacement par défaut : le premier de la liste.
    _locationId ??= data.locations.isNotEmpty ? data.locations.first.id : null;

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
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Ajouter un produit',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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
                  TextFormField(
                    controller: _nameController,
                    textCapitalization: TextCapitalization.sentences,
                    // Pas d'autofocus si le nom est déjà pré-rempli (scan) :
                    // on évite d'ouvrir le clavier par-dessus le formulaire.
                    autofocus: (widget.prefill?.name ?? '').isEmpty,
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
                            loc.icon != null ? '${loc.icon}  ${loc.name}' : loc.name,
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
                            cat.icon != null ? '${cat.icon}  ${cat.name}' : cat.name,
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
                            return num.tryParse(v.trim().replaceAll(',', '.')) ==
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
                            for (final u in _units)
                              DropdownMenuItem(value: u, child: Text(u)),
                          ],
                          onChanged: (v) =>
                              setState(() => _unit = v ?? _unit),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _DateField(
                    date: _expiresAt,
                    onTap: _pickDate,
                    onClear: () => setState(() => _expiresAt = null),
                    hasCategory: _categoryId != null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _barcodeController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Code-barres (optionnel)',
                      prefixIcon: Icon(Icons.qr_code),
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
                  : const Icon(Icons.check),
              label: Text(_submitting ? 'Ajout…' : 'Ajouter'),
            ),
          ),
        ),
      ],
    );
  }
}

/// Champ de sélection de la date de péremption (optionnel).
class _DateField extends StatelessWidget {
  const _DateField({
    required this.date,
    required this.onTap,
    required this.onClear,
    required this.hasCategory,
  });

  final DateTime? date;
  final VoidCallback onTap;
  final VoidCallback onClear;
  final bool hasCategory;

  @override
  Widget build(BuildContext context) {
    final label = date != null
        ? DateFormat('dd/MM/yyyy').format(date!)
        : (hasCategory ? 'Estimée selon la catégorie' : 'Aucune date');
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: 'Date de péremption',
          prefixIcon: const Icon(Icons.event_outlined),
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
            color: date != null
                ? AppColors.textPrimary
                : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
