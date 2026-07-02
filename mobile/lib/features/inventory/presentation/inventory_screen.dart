import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/expiry.dart';
import '../../../core/widgets/async_state_views.dart';
import '../application/inventory_providers.dart';
import '../domain/inventory_models.dart';
import 'add_product_sheet.dart';
import 'location_style.dart';
import 'product_image.dart';

/// Onglet Inventaire : la liste des produits en stock, regroupés par
/// emplacement, avec badge de péremption, recherche, filtres (emplacement /
/// péremption) et tri. Lecture seule pour l'instant (édition à venir).
class InventoryScreen extends ConsumerWidget {
  const InventoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inventory = ref.watch(inventoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventaire',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          inventory.maybeWhen(
            data: (data) => Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Text(
                  '${data.products.length} produit${data.products.length > 1 ? 's' : ''}',
                  style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w500),
                ),
              ),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => showAddProductSheet(context),
        tooltip: 'Ajouter un produit',
        child: const Icon(Icons.add),
      ),
      body: inventory.when(
        loading: () => const LoadingView(),
        error: (_, _) => ErrorRetryView(
          title: 'Impossible de charger l\'inventaire',
          onRetry: () => ref.invalidate(inventoryProvider),
        ),
        data: (data) {
          // Inventaire réellement vide : pas de filtres à afficher, on invite
          // directement à ajouter un produit.
          if (data.products.isEmpty) {
            return RefreshIndicator(
              onRefresh: () => _refresh(ref),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.18),
                  const EmptyView(
                    icon: Icons.inventory_2_outlined,
                    title: 'Ton inventaire est vide',
                    message: 'Ajoute ton premier produit pour commencer.',
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: FilledButton.icon(
                      onPressed: () => showAddProductSheet(context),
                      icon: const Icon(Icons.add),
                      label: const Text('Ajouter un produit'),
                    ),
                  ),
                ],
              ),
            );
          }

          final filters = ref.watch(inventoryFiltersProvider);
          final view = buildInventoryView(data, filters);
          return Column(
            children: [
              _InventoryControls(locations: data.locations),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () => _refresh(ref),
                  child: view.groups.isEmpty
                      ? _NoResultsView(
                          onReset: () => ref
                              .read(inventoryFiltersProvider.notifier)
                              .clear(),
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(16),
                          itemCount: view.groups.length,
                          itemBuilder: (_, i) =>
                              _LocationGroupCard(group: view.groups[i]),
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(inventoryProvider);
    await ref.read(inventoryProvider.future);
  }
}

/// Barre de contrôles de l'inventaire : recherche, tri, et filtres par
/// emplacement et par état de péremption.
class _InventoryControls extends ConsumerWidget {
  const _InventoryControls({required this.locations});

  final List<Location> locations;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = ref.watch(inventoryFiltersProvider);
    final notifier = ref.read(inventoryFiltersProvider.notifier);

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: _SearchField(notifier: notifier)),
              _SortButton(
                current: filters.sort,
                onSelected: notifier.setSort,
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Filtres péremption (axe « état ») puis emplacements (axe « lieu »),
          // sur une même rangée défilante.
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.only(right: 8),
            child: Row(
              children: [
                _ExpiryChip(
                  label: 'Bientôt',
                  value: ExpiryFilter.soon,
                  current: filters.expiry,
                  color: AppColors.urgencySoon,
                  onSelected: notifier.setExpiry,
                ),
                const SizedBox(width: 8),
                _ExpiryChip(
                  label: 'Périmés',
                  value: ExpiryFilter.expired,
                  current: filters.expiry,
                  color: AppColors.urgencyExpired,
                  onSelected: notifier.setExpiry,
                ),
                if (locations.isNotEmpty) ...[
                  const _ChipDivider(),
                  _LocationChip(
                    label: 'Tous',
                    locationId: null,
                    current: filters.locationId,
                    onSelected: notifier.setLocation,
                  ),
                  for (final location in locations) ...[
                    const SizedBox(width: 8),
                    _LocationChip(
                      label: location.name,
                      icon: location.icon,
                      locationId: location.id,
                      current: filters.locationId,
                      color: locationColor(location),
                      onSelected: notifier.setLocation,
                    ),
                  ],
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchField extends StatefulWidget {
  const _SearchField({required this.notifier});

  final InventoryFiltersNotifier notifier;

  @override
  State<_SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<_SearchField> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      textInputAction: TextInputAction.search,
      onChanged: (value) {
        widget.notifier.setSearch(value);
        // Affiche/masque le bouton d'effacement au fil de la saisie.
        setState(() {});
      },
      decoration: InputDecoration(
        isDense: true,
        hintText: 'Rechercher un produit…',
        prefixIcon: const Icon(Icons.search, size: 20),
        suffixIcon: _controller.text.isEmpty
            ? null
            : IconButton(
                icon: const Icon(Icons.close, size: 18),
                tooltip: 'Effacer',
                onPressed: () {
                  _controller.clear();
                  widget.notifier.setSearch('');
                  setState(() {});
                },
              ),
        filled: true,
        fillColor: AppColors.background,
        contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
      ),
      onTapOutside: (_) => FocusScope.of(context).unfocus(),
    );
  }
}

class _SortButton extends StatelessWidget {
  const _SortButton({required this.current, required this.onSelected});

  final InventorySort current;
  final ValueChanged<InventorySort> onSelected;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<InventorySort>(
      icon: const Icon(Icons.sort),
      tooltip: 'Trier',
      initialValue: current,
      onSelected: onSelected,
      itemBuilder: (_) => const [
        PopupMenuItem(
          value: InventorySort.expiry,
          child: Text('Péremption (urgent d\'abord)'),
        ),
        PopupMenuItem(
          value: InventorySort.name,
          child: Text('Nom (A → Z)'),
        ),
      ],
    );
  }
}

/// Puce de filtre par état de péremption (sélection unique, re-cliquer
/// désélectionne et revient à « tous »).
class _ExpiryChip extends StatelessWidget {
  const _ExpiryChip({
    required this.label,
    required this.value,
    required this.current,
    required this.color,
    required this.onSelected,
  });

  final String label;
  final ExpiryFilter value;
  final ExpiryFilter current;
  final Color color;
  final ValueChanged<ExpiryFilter> onSelected;

  @override
  Widget build(BuildContext context) {
    final selected = current == value;
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) =>
          onSelected(selected ? ExpiryFilter.all : value),
      showCheckmark: false,
      avatar: Icon(Icons.circle, size: 10, color: color),
      selectedColor: color.withValues(alpha: 0.15),
      side: BorderSide(color: selected ? color : AppColors.border),
      labelStyle: TextStyle(
        fontWeight: FontWeight.w600,
        color: selected ? color : AppColors.textPrimary,
      ),
      backgroundColor: AppColors.surface,
    );
  }
}

/// Puce de filtre par emplacement (`null` = tous les emplacements).
class _LocationChip extends StatelessWidget {
  const _LocationChip({
    required this.label,
    required this.locationId,
    required this.current,
    required this.onSelected,
    this.icon,
    this.color = AppColors.primary,
  });

  final String label;
  final String? icon;
  final String? locationId;
  final String? current;
  final Color color;
  final ValueChanged<String?> onSelected;

  @override
  Widget build(BuildContext context) {
    final selected = current == locationId;
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onSelected(selected && locationId != null ? null : locationId),
      showCheckmark: locationId == null,
      avatar: icon != null
          ? Text(icon!, style: const TextStyle(fontSize: 14))
          : null,
      selectedColor: color.withValues(alpha: 0.15),
      side: BorderSide(color: selected ? color : AppColors.border),
      labelStyle: TextStyle(
        fontWeight: FontWeight.w600,
        color: selected ? color : AppColors.textPrimary,
      ),
      backgroundColor: AppColors.surface,
    );
  }
}

/// Petit séparateur vertical entre les deux axes de filtres.
class _ChipDivider extends StatelessWidget {
  const _ChipDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 24,
      margin: const EdgeInsets.symmetric(horizontal: 12),
      color: AppColors.border,
    );
  }
}

/// Affiché quand les filtres ne renvoient aucun produit.
class _NoResultsView extends StatelessWidget {
  const _NoResultsView({required this.onReset});

  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.12),
        const EmptyView(
          icon: Icons.search_off,
          title: 'Aucun produit ne correspond',
          message: 'Essaie de modifier ta recherche ou tes filtres.',
        ),
        const SizedBox(height: 16),
        Center(
          child: TextButton.icon(
            onPressed: onReset,
            icon: const Icon(Icons.filter_alt_off),
            label: const Text('Réinitialiser les filtres'),
          ),
        ),
      ],
    );
  }
}

class _LocationGroupCard extends StatelessWidget {
  const _LocationGroupCard({required this.group});

  final InventoryGroup group;

  @override
  Widget build(BuildContext context) {
    final location = group.location;
    final color =
        location != null ? locationColor(location) : AppColors.neutral400;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: location?.icon != null
                    ? Text(location!.icon!, style: const TextStyle(fontSize: 18))
                    : Icon(Icons.inventory_2_outlined, size: 18, color: color),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  group.label,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              Text(
                '${group.products.length}',
                style: TextStyle(fontWeight: FontWeight.bold, color: color),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                for (var i = 0; i < group.products.length; i++) ...[
                  if (i > 0)
                    const Divider(
                        height: 1,
                        indent: 16,
                        endIndent: 16,
                        color: AppColors.border),
                  _ProductRow(product: group.products[i]),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductRow extends StatelessWidget {
  const _ProductRow({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final date = product.expiresAt;
    final days = date != null ? daysUntilExpiry(date) : null;
    final quantity = _formatQuantity(product);

    return InkWell(
      onTap: () => context.push('/inventory/product/${product.id}',
          extra: product),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
          if (product.imageUrl != null && product.imageUrl!.isNotEmpty) ...[
            ProductThumb(
              imageUrl: product.imageUrl,
              emoji: product.categoryIcon,
              size: 38,
              radius: 9,
            ),
            const SizedBox(width: 10),
          ] else if (product.categoryIcon != null) ...[
            Text(product.categoryIcon!, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 10),
          ],
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
                if (quantity != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    quantity,
                    style: const TextStyle(
                        fontSize: 12.5, color: AppColors.textSecondary),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (days != null && date != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  expiryLabel(days),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: expiryColor(days),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  DateFormat('dd/MM/yyyy').format(date),
                  style:
                      const TextStyle(fontSize: 11, color: AppColors.neutral400),
                ),
              ],
            ),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right,
              size: 18, color: AppColors.neutral400),
          ],
        ),
      ),
    );
  }
}

/// Met en forme la quantité d'un produit : « 2 pièces », « 50 g »… ou `null`
/// si aucune quantité n'est renseignée.
String? _formatQuantity(Product product) {
  final quantity = product.quantity;
  if (quantity == null) return null;
  final value =
      quantity % 1 == 0 ? quantity.toInt().toString() : quantity.toString();
  final unit = product.unit;
  return (unit != null && unit.isNotEmpty) ? '$value $unit' : value;
}
