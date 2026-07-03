import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/expiry.dart';
import '../../core/widgets/async_state_views.dart';
import '../auth/application/auth_controller.dart';
import '../auth/presentation/logout_action.dart';
import '../inventory/application/inventory_providers.dart';
import '../inventory/domain/inventory_models.dart';
import '../inventory/presentation/add_product_sheet.dart';
import '../inventory/presentation/location_style.dart';
import 'dashboard_provider.dart';

/// Tableau de bord : salutation, foyer actif, produits à consommer vite,
/// et répartition du stock par emplacement.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth is AuthAuthenticated ? auth.user : null;
    final firstName = (user?.name ?? '').split(' ').first;
    final householdName =
        (user != null && user.households.isNotEmpty) ? user.households.first.name : null;

    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.home_outlined, size: 20),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                householdName ?? 'Accueil',
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Déconnexion',
            icon: const Icon(Icons.logout),
            // HOME-4 : confirmation avant de déconnecter (dialog natif partagé).
            onPressed: () => confirmAndLogout(context, ref),
          ),
        ],
      ),
      body: dashboard.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => ErrorRetryView(
          title: 'Impossible de charger ton frigo',
          onRetry: () => ref.invalidate(dashboardProvider),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(dashboardProvider);
            await ref.read(dashboardProvider.future);
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                firstName.isEmpty ? 'Bonjour 👋' : 'Bonjour $firstName 👋',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text(
                'Voici l\'état de ton frigo.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              const _QuickActions(),
              const SizedBox(height: 20),
              _ExpiringSection(expiring: data.expiring),
              const SizedBox(height: 20),
              _StockSection(total: data.totalProducts, locations: data.locations),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Actions rapides (HOME-5) : ajouter un produit / scanner un code-barre
// ---------------------------------------------------------------------------

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: FilledButton.tonalIcon(
            // Ouvre le formulaire d'ajout (le sheet invalide le dashboard au
            // succès → l'accueil se rafraîchit tout seul).
            onPressed: () => showAddProductSheet(context),
            icon: const Icon(Icons.add),
            label: const Text('Ajouter'),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: FilledButton.tonalIcon(
            onPressed: () => context.push('/scan'),
            icon: const Icon(Icons.qr_code_scanner),
            label: const Text('Scanner'),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Section « À consommer vite »
// ---------------------------------------------------------------------------

class _ExpiringSection extends StatelessWidget {
  const _ExpiringSection({required this.expiring});

  final List<Product> expiring;

  @override
  Widget build(BuildContext context) {
    if (expiring.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFF0FDF4), // green-50
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFBBF7D0)), // green-200
        ),
        child: Row(
          children: const [
            Icon(Icons.check_circle_outline, color: AppColors.success),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Rien ne périme bientôt 🎉\nTon frigo est sous contrôle.',
                style: TextStyle(color: Color(0xFF166534), height: 1.4),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7ED), // orange-50
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFED7AA)), // orange-200
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: AppColors.warning),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${expiring.length} produit(s) à surveiller',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF9A3412),
                  ),
                ),
              ),
              // HOME-6 : accès à la vue Péremptions complète (fenêtre 3/7/14/30 j).
              TextButton(
                onPressed: () => context.push('/expiring'),
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF9A3412),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: const Size(0, 32),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Voir tout'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          for (final product in expiring) _ExpiringTile(product: product),
        ],
      ),
    );
  }
}

class _ExpiringTile extends StatelessWidget {
  const _ExpiringTile({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final date = product.expiresAt;
    final days = date != null ? daysUntilExpiry(date) : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          // Raccourci vers la fiche produit (HOME-3 → INV-5).
          onTap: () => context.go('/inventory/product/${product.id}',
              extra: product),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                      if (product.locationName != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          product.locationName!,
                          style: const TextStyle(
                              fontSize: 12.5, color: AppColors.textSecondary),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                if (days != null)
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
                      if (date != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          DateFormat('dd/MM/yyyy').format(date),
                          style: const TextStyle(
                              fontSize: 11, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ],
                  ),
                const SizedBox(width: 4),
                const Icon(Icons.chevron_right,
                    size: 18, color: AppColors.neutral400),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Section « Mon stock »
// ---------------------------------------------------------------------------

class _StockSection extends StatelessWidget {
  const _StockSection({required this.total, required this.locations});

  final int total;
  final List<LocationCount> locations;

  @override
  Widget build(BuildContext context) {
    if (total == 0) {
      return Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: const [
            Icon(Icons.kitchen_outlined, size: 48, color: Color(0xFFCBD5E1)),
            SizedBox(height: 12),
            Text(
              'Ton frigo est vide',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 4),
            Text(
              'Ajoute tes premiers produits depuis l\'inventaire (bientôt disponible).',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Mon stock',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const Spacer(),
            Text(
              '$total produit${total > 1 ? 's' : ''}',
              style: const TextStyle(
                  color: AppColors.textSecondary, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              for (var i = 0; i < locations.length; i++) ...[
                if (i > 0)
                  const Divider(height: 1, indent: 64, color: AppColors.border),
                _LocationRow(item: locations[i]),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _LocationRow extends ConsumerWidget {
  const _LocationRow({required this.item});

  final LocationCount item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = locationColor(item.location);
    return InkWell(
      // Ouvre l'inventaire pré-filtré sur cet emplacement (HOME-3 → INV-3).
      onTap: () {
        ref
            .read(inventoryFiltersProvider.notifier)
            .setLocation(item.location.id);
        context.go('/inventory');
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
              child: item.location.icon != null
                  ? Text(item.location.icon!,
                      style: const TextStyle(fontSize: 18))
                  : Icon(Icons.inventory_2_outlined, size: 20, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.location.name,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            Text(
              '${item.count}',
              style: TextStyle(
                  fontSize: 16, fontWeight: FontWeight.bold, color: color),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.neutral400),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers de péremption/couleur : voir `core/utils/expiry.dart` et
// `inventory/presentation/location_style.dart` (partagés avec l'inventaire).
// ---------------------------------------------------------------------------
