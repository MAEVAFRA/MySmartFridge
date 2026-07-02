import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/expiry.dart';
import '../../../core/widgets/async_state_views.dart';
import '../application/inventory_providers.dart';
import '../domain/inventory_models.dart';
import 'location_style.dart';
import 'locations_screen.dart';
import 'product_image.dart';

/// Détail d'un emplacement (INV-13) : ses infos (type, température) et la liste
/// des produits qu'il contient. Modification / suppression depuis l'AppBar.
class LocationDetailScreen extends ConsumerWidget {
  const LocationDetailScreen({
    super.key,
    required this.locationId,
    this.initial,
  });

  final String locationId;
  final Location? initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(locationDetailProvider(locationId));
    final location = async.whenOrNull(data: (d) => d.location) ?? initial;
    final products = async.whenOrNull(data: (d) => d.products);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          location?.name ?? 'Emplacement',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          if (location != null) ...[
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Modifier',
              onPressed: () =>
                  showLocationFormSheet(context, ref, editing: location),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Supprimer',
              onPressed: () async {
                final deleted = await confirmDeleteLocation(
                    context, ref, location, products?.length ?? 0);
                if (deleted && context.mounted) context.pop();
              },
            ),
          ],
        ],
        bottom: async.isLoading
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2),
              )
            : null,
      ),
      body: async.when(
        loading: () => location == null
            ? const LoadingView()
            : _Body(location: location, products: const []),
        error: (_, _) => location == null
            ? ErrorRetryView(
                title: 'Emplacement introuvable',
                onRetry: () =>
                    ref.invalidate(locationDetailProvider(locationId)),
              )
            : _Body(location: location, products: const []),
        data: (detail) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(locationDetailProvider(locationId));
            await ref.read(locationDetailProvider(locationId).future);
          },
          child: _Body(location: detail.location, products: detail.products),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.location, required this.products});

  final Location location;
  final List<Product> products;

  @override
  Widget build(BuildContext context) {
    final color = locationColor(location);
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _HeaderCard(location: location, color: color, count: products.length),
        const SizedBox(height: 20),
        Text(
          'Produits (${products.length})',
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        if (products.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 24),
            child: EmptyView(
              icon: Icons.inventory_2_outlined,
              title: 'Aucun produit ici',
              message: 'Ajoute des produits à cet emplacement depuis '
                  'l\'inventaire.',
            ),
          )
        else
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                for (var i = 0; i < products.length; i++) ...[
                  if (i > 0)
                    const Divider(
                        height: 1,
                        indent: 16,
                        endIndent: 16,
                        color: AppColors.border),
                  _ProductTile(product: products[i], locationId: location.id),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({
    required this.location,
    required this.color,
    required this.count,
  });

  final Location location;
  final Color color;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(14),
            ),
            alignment: Alignment.center,
            child: location.icon != null
                ? Text(location.icon!, style: const TextStyle(fontSize: 28))
                : Icon(Icons.place_outlined, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  location.name,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    locationTypeLabel(location.type),
                    if (location.temperatureCelsius != null)
                      '${location.temperatureCelsius}°C',
                    '$count produit${count > 1 ? 's' : ''}',
                  ].join(' • '),
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          if (location.isDefault)
            const Icon(Icons.star, color: AppColors.warning, size: 20),
        ],
      ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({required this.product, required this.locationId});

  final Product product;
  final String locationId;

  @override
  Widget build(BuildContext context) {
    final date = product.expiresAt;
    final days = date != null ? daysUntilExpiry(date) : null;
    return InkWell(
      onTap: () => context.push(
          '/locations/$locationId/product/${product.id}',
          extra: product),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            ProductThumb(
              imageUrl: product.imageUrl,
              emoji: product.categoryIcon,
              size: 38,
              radius: 9,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                product.name,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            if (days != null && date != null) ...[
              const SizedBox(width: 8),
              Text(
                expiryLabel(days),
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: expiryColor(days),
                ),
              ),
            ],
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.neutral400),
          ],
        ),
      ),
    );
  }
}
