import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/expiry.dart';
import '../../../core/widgets/async_state_views.dart';
import '../application/inventory_providers.dart';
import '../domain/inventory_models.dart';
import 'categories_screen.dart';
import 'location_style.dart';
import 'product_image.dart';

/// Détail d'une catégorie (INV-15) : durées de conservation et produits qui
/// l'utilisent. Modification / suppression depuis l'AppBar.
class CategoryDetailScreen extends ConsumerWidget {
  const CategoryDetailScreen({
    super.key,
    required this.categoryId,
    this.initial,
  });

  final String categoryId;
  final Category? initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(categoryDetailProvider(categoryId));
    final category = async.whenOrNull(data: (d) => d.category) ?? initial;
    final products = async.whenOrNull(data: (d) => d.products);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          category?.name ?? 'Catégorie',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          if (category != null) ...[
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Modifier',
              onPressed: () =>
                  showCategoryFormSheet(context, ref, editing: category),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Supprimer',
              onPressed: () async {
                final deleted = await confirmDeleteCategory(
                    context, ref, category, products?.length ?? 0);
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
        loading: () => category == null
            ? const LoadingView()
            : _Body(category: category, products: const []),
        error: (_, _) => category == null
            ? ErrorRetryView(
                title: 'Catégorie introuvable',
                onRetry: () =>
                    ref.invalidate(categoryDetailProvider(categoryId)),
              )
            : _Body(category: category, products: const []),
        data: (detail) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(categoryDetailProvider(categoryId));
            await ref.read(categoryDetailProvider(categoryId).future);
          },
          child: _Body(category: detail.category, products: detail.products),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.category, required this.products});

  final Category category;
  final List<Product> products;

  @override
  Widget build(BuildContext context) {
    final color = parseHexColor(category.colorHex) ?? AppColors.primary;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _HeaderCard(category: category, color: color),
        const SizedBox(height: 16),
        _ConservationCard(category: category),
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
              title: 'Aucun produit',
              message: 'Aucun produit n\'utilise cette catégorie pour l\'instant.',
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
                  _ProductTile(product: products[i], categoryId: category.id),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.category, required this.color});

  final Category category;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(14),
          ),
          alignment: Alignment.center,
          child: Text(category.icon ?? '📦',
              style: const TextStyle(fontSize: 28)),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                category.name,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 2),
              Text(
                category.isSystem ? 'Catégorie par défaut' : 'Personnalisée',
                style: const TextStyle(
                    fontSize: 13, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Carte des durées de conservation (INV-15).
class _ConservationCard extends StatelessWidget {
  const _ConservationCard({required this.category});

  final Category category;

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[
      if (category.avgShelfDays != null)
        _row(Icons.schedule, 'Conservation', '${category.avgShelfDays} jours'),
      if (category.avgShelfDaysOpened != null)
        _row(Icons.lock_open_outlined, 'Une fois entamé',
            '${category.avgShelfDaysOpened} jours'),
      if (category.avgShelfDaysFreezer != null)
        _row(Icons.ac_unit, 'Au congélateur',
            '${category.avgShelfDaysFreezer} jours'),
      if (category.storageInstructions != null &&
          category.storageInstructions!.trim().isNotEmpty)
        _row(Icons.info_outline, 'Conseil',
            category.storageInstructions!.trim()),
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            conservationSummary(category),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          if (rows.isNotEmpty) ...[
            const SizedBox(height: 12),
            for (final r in rows) ...[r, const SizedBox(height: 8)],
          ] else ...[
            const SizedBox(height: 6),
            const Text(
              'Ajoute des durées de conservation pour estimer automatiquement '
              'les dates de péremption.',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          ],
        ],
      ),
    );
  }

  Widget _row(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: 10),
        Text(label, style: const TextStyle(color: AppColors.textSecondary)),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({required this.product, required this.categoryId});

  final Product product;
  final String categoryId;

  @override
  Widget build(BuildContext context) {
    final date = product.expiresAt;
    final days = date != null ? daysUntilExpiry(date) : null;
    return InkWell(
      onTap: () => context.push(
          '/categories/$categoryId/product/${product.id}',
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
