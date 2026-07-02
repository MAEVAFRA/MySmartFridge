import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/async_state_views.dart';
import '../../inventory/application/inventory_providers.dart';
import '../../inventory/domain/inventory_models.dart';
import '../application/shopping_providers.dart';

/// Ouvre la modale « Ajouter depuis mon stock » (SHOP-6) pour la liste [listId].
///
/// [existingProductIds] recense les produits déjà liés à la liste : ils sont
/// grisés et non sélectionnables (le backend les ignorerait de toute façon).
Future<void> showAddFromInventorySheet(
  BuildContext context, {
  required String listId,
  required Set<String> existingProductIds,
  required String listName,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _AddFromInventorySheet(
      listId: listId,
      existingProductIds: existingProductIds,
      listName: listName,
    ),
  );
}

class _AddFromInventorySheet extends ConsumerStatefulWidget {
  const _AddFromInventorySheet({
    required this.listId,
    required this.existingProductIds,
    required this.listName,
  });

  final String listId;
  final Set<String> existingProductIds;
  final String listName;

  @override
  ConsumerState<_AddFromInventorySheet> createState() =>
      _AddFromInventorySheetState();
}

class _AddFromInventorySheetState
    extends ConsumerState<_AddFromInventorySheet> {
  /// Produits sélectionnés : id → quantité à acheter.
  final Map<String, num> _selected = {};
  String _search = '';
  bool _lowOnly = false;
  bool _submitting = false;

  bool _matchesSearch(Product p) {
    final q = _search.trim().toLowerCase();
    if (q.isEmpty) return true;
    return p.name.toLowerCase().contains(q) ||
        (p.brand?.toLowerCase().contains(q) ?? false);
  }

  void _toggle(Product p) {
    setState(() {
      if (_selected.containsKey(p.id)) {
        _selected.remove(p.id);
      } else {
        final qty = p.quantity;
        _selected[p.id] = (qty != null && qty > 0) ? qty : 1;
      }
    });
  }

  void _bump(String id, num delta) {
    setState(() {
      final current = _selected[id] ?? 1;
      final next = current + delta;
      _selected[id] = next < 1 ? 1 : next;
    });
  }

  Future<void> _submit() async {
    if (_selected.isEmpty || _submitting) return;
    setState(() => _submitting = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final result = await ref
          .read(shoppingActionsProvider)
          .addFromInventory(widget.listId, Map.of(_selected));
      if (!mounted) return;
      Navigator.of(context).pop();
      final skipped = result.skipped > 0
          ? ' (${result.skipped} déjà présent${result.skipped > 1 ? 's' : ''})'
          : '';
      messenger.showSnackBar(
        SnackBar(
          content: Text(result.added > 0
              ? '${result.added} article${result.added > 1 ? 's' : ''} ajouté${result.added > 1 ? 's' : ''} depuis le stock$skipped'
              : 'Aucun nouvel article ajouté$skipped'),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Échec de l\'ajout depuis le stock. Réessaie.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final inventory = ref.watch(inventoryProvider);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: Column(
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
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
              child: Row(
                children: [
                  const Icon(Icons.inventory_2_outlined,
                      color: AppColors.primaryDark),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Ajouter depuis le stock',
                      style: TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                    tooltip: 'Fermer',
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Sélectionne les produits à ajouter à « ${widget.listName} ».',
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
              ),
            ),
            _SearchBar(
              lowOnly: _lowOnly,
              onSearch: (v) => setState(() => _search = v),
              onToggleLow: () => setState(() => _lowOnly = !_lowOnly),
            ),
            Flexible(
              child: inventory.when(
                loading: () => const SizedBox(height: 240, child: LoadingView()),
                error: (_, _) => SizedBox(
                  height: 240,
                  child: ErrorRetryView(
                    title: 'Impossible de charger le stock',
                    onRetry: () => ref.invalidate(inventoryProvider),
                  ),
                ),
                data: (data) => _buildList(data.products),
              ),
            ),
            _Footer(
              count: _selected.length,
              submitting: _submitting,
              onCancel: () => Navigator.of(context).pop(),
              onSubmit: _submit,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildList(List<Product> products) {
    final visible = products
        .where(_matchesSearch)
        .where((p) => !_lowOnly || p.isLowStock)
        .toList();

    if (visible.isEmpty) {
      return SizedBox(
        height: 240,
        child: EmptyView(
          icon: Icons.inventory_2_outlined,
          title: products.isEmpty ? 'Stock vide' : 'Aucun produit',
          message: products.isEmpty
              ? 'Ajoute des produits à ton inventaire d\'abord.'
              : (_lowOnly
                  ? 'Aucun produit en stock bas.'
                  : 'Aucun produit ne correspond à ta recherche.'),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: visible.length,
      separatorBuilder: (_, _) => const SizedBox(height: 2),
      itemBuilder: (_, i) {
        final p = visible[i];
        final already = widget.existingProductIds.contains(p.id);
        final selected = _selected.containsKey(p.id);
        return _ProductRow(
          product: p,
          already: already,
          selected: selected,
          quantity: _selected[p.id],
          onTap: already ? null : () => _toggle(p),
          onDecrement: () => _bump(p.id, -1),
          onIncrement: () => _bump(p.id, 1),
        );
      },
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({
    required this.lowOnly,
    required this.onSearch,
    required this.onToggleLow,
  });

  final bool lowOnly;
  final ValueChanged<String> onSearch;
  final VoidCallback onToggleLow;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              onChanged: onSearch,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                isDense: true,
                hintText: 'Rechercher un produit…',
                prefixIcon: const Icon(Icons.search, size: 20),
                filled: true,
                fillColor: AppColors.background,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Stock bas'),
            selected: lowOnly,
            onSelected: (_) => onToggleLow(),
            avatar: Icon(
              Icons.trending_down,
              size: 18,
              color: lowOnly ? AppColors.warning : AppColors.textSecondary,
            ),
            showCheckmark: false,
            selectedColor: const Color(0xFFFEF3C7), // amber-100
            backgroundColor: AppColors.surface,
            side: BorderSide(
              color: lowOnly ? AppColors.warning : AppColors.border,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductRow extends StatelessWidget {
  const _ProductRow({
    required this.product,
    required this.already,
    required this.selected,
    required this.quantity,
    required this.onTap,
    required this.onDecrement,
    required this.onIncrement,
  });

  final Product product;
  final bool already;
  final bool selected;
  final num? quantity;
  final VoidCallback? onTap;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;

  @override
  Widget build(BuildContext context) {
    final active = selected || already;
    return Opacity(
      opacity: already ? 0.5 : 1,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: [
              Icon(
                active ? Icons.check_circle : Icons.radio_button_unchecked,
                color: active ? AppColors.primaryDark : AppColors.neutral400,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _subtitle(product, already),
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              if (selected && !already) ...[
                const SizedBox(width: 8),
                _QuantityStepper(
                  quantity: quantity ?? 1,
                  onDecrement: onDecrement,
                  onIncrement: onIncrement,
                ),
              ] else if (product.isLowStock && !already) ...[
                const SizedBox(width: 8),
                const _LowStockBadge(),
              ],
            ],
          ),
        ),
      ),
    );
  }

  static String _subtitle(Product p, bool already) {
    final qty = p.quantity;
    final unit = p.unit ?? '';
    final stock = qty != null
        ? 'En stock : ${qty % 1 == 0 ? qty.toInt() : qty} $unit'.trim()
        : 'En stock';
    final loc = p.locationName;
    final where = (loc != null && loc.isNotEmpty)
        ? ' • ${p.locationIcon ?? ''} $loc'.trimRight()
        : '';
    final tag = already ? ' • déjà dans la liste' : '';
    return '$stock$where$tag';
  }
}

class _QuantityStepper extends StatelessWidget {
  const _QuantityStepper({
    required this.quantity,
    required this.onDecrement,
    required this.onIncrement,
  });

  final num quantity;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;

  @override
  Widget build(BuildContext context) {
    final label = quantity % 1 == 0 ? quantity.toInt().toString() : '$quantity';
    return Container(
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StepButton(icon: Icons.remove, onTap: onDecrement),
          Container(
            constraints: const BoxConstraints(minWidth: 28),
            alignment: Alignment.center,
            child: Text(
              label,
              style: const TextStyle(
                  fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
          ),
          _StepButton(icon: Icons.add, onTap: onIncrement),
        ],
      ),
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(icon, size: 18, color: AppColors.primaryDark),
      ),
    );
  }
}

class _LowStockBadge extends StatelessWidget {
  const _LowStockBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7), // amber-100
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Text(
        'Stock bas',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: Color(0xFFB45309), // amber-700
        ),
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({
    required this.count,
    required this.submitting,
    required this.onCancel,
    required this.onSubmit,
  });

  final int count;
  final bool submitting;
  final VoidCallback onCancel;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: EdgeInsets.fromLTRB(
          20, 10, 20, 12 + MediaQuery.of(context).padding.bottom),
      child: Row(
        children: [
          Text(
            '$count sélectionné${count > 1 ? 's' : ''}',
            style: const TextStyle(
                color: AppColors.textSecondary, fontWeight: FontWeight.w600),
          ),
          const Spacer(),
          TextButton(onPressed: onCancel, child: const Text('Annuler')),
          const SizedBox(width: 8),
          FilledButton.icon(
            onPressed: (count == 0 || submitting) ? null : onSubmit,
            icon: submitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.add),
            label: Text(count == 0 ? 'Ajouter' : 'Ajouter ($count)'),
          ),
        ],
      ),
    );
  }
}
