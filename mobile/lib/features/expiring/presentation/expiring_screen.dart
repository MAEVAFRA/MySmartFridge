import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/expiry.dart';
import '../../../core/widgets/async_state_views.dart';
import '../../inventory/domain/inventory_models.dart';
import '../application/expiring_providers.dart';

/// Écran Péremptions (EXP-1/EXP-2) : produits déjà périmés + à venir, avec un
/// sélecteur de fenêtre (3/7/14/30 j). Libellés relatifs et code couleur
/// d'urgence réutilisent les helpers partagés (`core/utils/expiry.dart`).
///
/// Route plein écran poussée par-dessus la coquille (accessible depuis « Plus »).
class ExpiringScreen extends ConsumerWidget {
  const ExpiringScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final days = ref.watch(expiringWindowProvider);
    final async = ref.watch(expiringProductsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Péremptions',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          _WindowSelector(days: days, loading: async.isLoading),
          Expanded(
            child: async.when(
              // On garde l'ancienne liste visible pendant un changement de
              // fenêtre (la barre fine du sélecteur signale le chargement).
              skipLoadingOnReload: true,
              loading: () => const LoadingView(),
              error: (_, _) => ErrorRetryView(
                title: 'Impossible de charger les péremptions',
                onRetry: () => ref.invalidate(expiringProductsProvider),
              ),
              data: (products) =>
                  _ExpiringList(products: products, days: days),
            ),
          ),
        ],
      ),
    );
  }
}

Future<void> _refresh(WidgetRef ref) async {
  ref.invalidate(expiringProductsProvider);
  await ref.read(expiringProductsProvider.future);
}

/// En-tête fixe : intitulé + sélecteur segmenté de la fenêtre de péremption.
class _WindowSelector extends ConsumerWidget {
  const _WindowSelector({required this.days, required this.loading});

  final int days;
  final bool loading;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.schedule, size: 18, color: AppColors.textSecondary),
                    SizedBox(width: 8),
                    Text(
                      'Périmés + à venir dans…',
                      style: TextStyle(
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: SegmentedButton<int>(
                    showSelectedIcon: false,
                    segments: [
                      for (final d in expiryWindows)
                        ButtonSegment(value: d, label: Text('$d j')),
                    ],
                    selected: {days},
                    onSelectionChanged: (selection) => ref
                        .read(expiringWindowProvider.notifier)
                        .setDays(selection.first),
                  ),
                ),
              ],
            ),
          ),
          // Barre de progression fine lors d'un changement de fenêtre.
          SizedBox(
            height: 2,
            child: loading ? const LinearProgressIndicator(minHeight: 2) : null,
          ),
        ],
      ),
    );
  }
}

/// Liste scrollable : sections « Déjà périmés » puis « Bientôt périmés »,
/// ou état « tout est bon » si la fenêtre ne remonte aucun produit.
class _ExpiringList extends ConsumerWidget {
  const _ExpiringList({required this.products, required this.days});

  final List<Product> products;
  final int days;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (products.isEmpty) {
      return _AllClearView(days: days, onRefresh: () => _refresh(ref));
    }

    final buckets = splitExpiring(products);
    return RefreshIndicator(
      onRefresh: () => _refresh(ref),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          if (buckets.expired.isNotEmpty) ...[
            _SectionHeader(
              icon: Icons.dangerous_outlined,
              color: AppColors.urgencyExpired,
              title:
                  'Déjà périmé${buckets.expired.length > 1 ? 's' : ''} (${buckets.expired.length})',
              subtitle: 'À consommer en urgence ou à retirer du stock.',
            ),
            const SizedBox(height: 10),
            for (final product in buckets.expired) ...[
              _ExpiringProductTile(product: product),
              const SizedBox(height: 8),
            ],
            const SizedBox(height: 14),
          ],
          if (buckets.upcoming.isNotEmpty) ...[
            _SectionHeader(
              icon: Icons.warning_amber_rounded,
              color: AppColors.warning,
              title:
                  'Bientôt périmé${buckets.upcoming.length > 1 ? 's' : ''} (${buckets.upcoming.length})',
            ),
            const SizedBox(height: 10),
            for (final product in buckets.upcoming) ...[
              _ExpiringProductTile(product: product),
              const SizedBox(height: 8),
            ],
          ],
        ],
      ),
    );
  }
}

/// Titre de section (avec icône/couleur d'urgence) + sous-titre optionnel.
class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.icon,
    required this.color,
    required this.title,
    this.subtitle,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                    fontSize: 16, fontWeight: FontWeight.bold, color: color),
              ),
            ),
          ],
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle!,
            style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
          ),
        ],
      ],
    );
  }
}

/// Tuile d'un produit à surveiller : pastille d'urgence, nom (+ badge
/// « Périmé »), quantité/emplacement/catégorie, libellé relatif + date.
/// Cliquable vers la fiche produit.
class _ExpiringProductTile extends StatelessWidget {
  const _ExpiringProductTile({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    // Garanti non nul par l'endpoint (filtre `expires_at != null`), mais on
    // retombe sur « aujourd'hui » par prudence pour ne jamais planter l'UI.
    final date = product.expiresAt ?? DateTime.now();
    final days = daysUntilExpiry(date);
    final color = expiryColor(days);
    final expired = days < 0;
    final subtitle = _subtitle(product);

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        onTap: () => context.push('/expiring/product/${product.id}',
            extra: product),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Icon(
                  expired ? Icons.warning_amber_rounded : Icons.schedule,
                  color: color,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            product.name,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary),
                          ),
                        ),
                        if (expired) ...[
                          const SizedBox(width: 8),
                          const _ExpiredBadge(),
                        ],
                      ],
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12.5, color: AppColors.textSecondary),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    expiryLabel(days),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: color,
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
      ),
    );
  }
}

/// Petit badge rouge « Périmé » affiché sur les produits dépassés.
class _ExpiredBadge extends StatelessWidget {
  const _ExpiredBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.urgencyExpired,
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Text(
        'Périmé',
        style: TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

/// État positif quand la fenêtre ne remonte aucun produit (scrollable pour
/// conserver le pull-to-refresh).
class _AllClearView extends StatelessWidget {
  const _AllClearView({required this.days, required this.onRefresh});

  final int days;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.10),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4), // green-50
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFBBF7D0)), // green-200
            ),
            child: Column(
              children: [
                const Icon(Icons.check_circle_outline,
                    size: 48, color: AppColors.success),
                const SizedBox(height: 12),
                const Text(
                  'Tout est bon ! 🎉',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF166534)),
                ),
                const SizedBox(height: 4),
                Text(
                  'Aucun produit périmé, et rien n\'expire dans les $days prochains jours.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFF166534), height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Sous-titre d'une tuile : quantité • emplacement • catégorie (parties
/// disponibles seulement), ou `null` si rien à afficher.
String? _subtitle(Product product) {
  final parts = <String>[];
  final quantity = _formatQuantity(product);
  if (quantity != null) parts.add(quantity);
  final location = product.locationName;
  if (location != null && location.isNotEmpty) {
    final icon = product.locationIcon;
    parts.add(icon != null ? '$icon $location' : location);
  }
  final category = product.categoryName;
  if (category != null && category.isNotEmpty) parts.add(category);
  return parts.isEmpty ? null : parts.join(' • ');
}

/// Quantité formatée (« 2 pièces », « 50 g »…) ou `null` si non renseignée.
String? _formatQuantity(Product product) {
  final quantity = product.quantity;
  if (quantity == null) return null;
  final value =
      quantity % 1 == 0 ? quantity.toInt().toString() : quantity.toString();
  final unit = product.unit;
  return (unit != null && unit.isNotEmpty) ? '$value $unit' : value;
}
