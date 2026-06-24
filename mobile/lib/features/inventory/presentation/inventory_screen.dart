import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/expiry.dart';
import '../../../core/widgets/async_state_views.dart';
import '../application/inventory_providers.dart';
import '../domain/inventory_models.dart';
import 'location_style.dart';

/// Onglet Inventaire : la liste des produits en stock, regroupés par
/// emplacement, avec badge de péremption. Lecture seule pour l'instant
/// (ajout/édition/recherche à venir).
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
      body: inventory.when(
        loading: () => const LoadingView(),
        error: (_, _) => ErrorRetryView(
          title: 'Impossible de charger l\'inventaire',
          onRetry: () => ref.invalidate(inventoryProvider),
        ),
        data: (data) {
          final groups = groupProductsByLocation(data.products, data.locations);
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(inventoryProvider);
              await ref.read(inventoryProvider.future);
            },
            child: groups.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.22),
                      const EmptyView(
                        icon: Icons.inventory_2_outlined,
                        title: 'Ton inventaire est vide',
                        message:
                            'Ajoute des produits depuis le scanner ou manuellement (bientôt disponible).',
                      ),
                    ],
                  )
                : ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    itemCount: groups.length,
                    itemBuilder: (_, i) => _LocationGroupCard(group: groups[i]),
                  ),
          );
        },
      ),
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

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
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
        ],
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
