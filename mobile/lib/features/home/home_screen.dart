import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../auth/application/auth_controller.dart';
import 'dashboard_provider.dart';
import '../inventory/domain/inventory_models.dart';

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
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: dashboard.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => _ErrorView(
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
    final days = date != null ? _daysLeft(date) : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, color: AppColors.textPrimary),
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
                  _urgencyLabel(days),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: _urgencyColor(days),
                  ),
                ),
                if (date != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    DateFormat('dd/MM/yyyy').format(date),
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                ],
              ],
            ),
        ],
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

class _LocationRow extends StatelessWidget {
  const _LocationRow({required this.item});

  final LocationCount item;

  @override
  Widget build(BuildContext context) {
    final color = _locationColor(item.location);
    return Padding(
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
                ? Text(item.location.icon!, style: const TextStyle(fontSize: 18))
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
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// État d'erreur
// ---------------------------------------------------------------------------

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined,
                size: 48, color: AppColors.textSecondary),
            const SizedBox(height: 12),
            const Text(
              'Impossible de charger ton frigo',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            const Text(
              'Vérifie ta connexion et réessaie.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

int _daysLeft(DateTime date) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final target = DateTime(date.year, date.month, date.day);
  return target.difference(today).inDays;
}

Color _urgencyColor(int days) {
  if (days <= 1) return AppColors.urgencyExpired; // périmé, aujourd'hui, demain
  if (days <= 3) return AppColors.urgencySoon;
  return AppColors.urgencyWeek;
}

String _urgencyLabel(int days) {
  if (days < 0) return 'Périmé depuis ${-days} j';
  if (days == 0) return "Expire aujourd'hui";
  if (days == 1) return 'Demain';
  return 'Dans $days jours';
}

Color _locationColor(Location loc) {
  final parsed = _parseHex(loc.colorHex);
  if (parsed != null) return parsed;
  switch (loc.type) {
    case 'fridge':
      return AppColors.fridge;
    case 'freezer':
      return AppColors.freezer;
    case 'pantry':
      return AppColors.pantry;
    default:
      return AppColors.primary;
  }
}

Color? _parseHex(String? hex) {
  if (hex == null || hex.isEmpty) return null;
  var h = hex.replaceAll('#', '').trim();
  if (h.length == 6) h = 'FF$h';
  if (h.length != 8) return null;
  final value = int.tryParse(h, radix: 16);
  return value == null ? null : Color(value);
}
