import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../auth/presentation/logout_action.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Plus', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        children: [
          ListTile(
            leading:
                const Icon(Icons.person_outline, color: AppColors.primary),
            title: const Text('Mon profil'),
            subtitle: const Text('Infos, régimes, allergies, mot de passe'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/profile'),
          ),
          const Divider(height: 1),
          ListTile(
            leading:
                const Icon(Icons.event_busy_outlined, color: AppColors.primary),
            title: const Text('Péremptions'),
            subtitle: const Text('Produits périmés et à venir'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/expiring'),
          ),
          const Divider(height: 1),
          ListTile(
            leading:
                const Icon(Icons.place_outlined, color: AppColors.primary),
            title: const Text('Emplacements'),
            subtitle: const Text('Frigo, congélateur, placards…'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/locations'),
          ),
          const Divider(height: 1),
          ListTile(
            leading:
                const Icon(Icons.category_outlined, color: AppColors.primary),
            title: const Text('Catégories'),
            subtitle: const Text('Icônes, couleurs, durées de conservation'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/categories'),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.tune, color: AppColors.primary),
            title: const Text('Paramètres'),
            subtitle: const Text('Thème, langue, à propos'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings'),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.dns_outlined, color: AppColors.primary),
            title: const Text('Serveur / API'),
            subtitle: const Text('Adresse du backend'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/server-settings'),
          ),
          const Divider(height: 1),
          // MORE-2 : déconnexion (avec confirmation) au bout des actions réelles.
          ListTile(
            leading: const Icon(Icons.logout, color: AppColors.error),
            title: const Text(
              'Se déconnecter',
              style: TextStyle(
                  color: AppColors.error, fontWeight: FontWeight.w600),
            ),
            onTap: () => confirmAndLogout(context, ref),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 24, 16, 8),
            child: Text(
              'Bientôt',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ),
          const _SoonTile(icon: Icons.restaurant_menu, label: 'Recettes'),
          const _SoonTile(
              icon: Icons.account_balance_wallet_outlined,
              label: 'Dépenses & budget'),
          const _SoonTile(icon: Icons.insights_outlined, label: 'Statistiques'),
          const _SoonTile(icon: Icons.groups_outlined, label: 'Foyer'),
        ],
      ),
    );
  }
}

/// Entrée d'une fonctionnalité pas encore disponible (désactivée).
class _SoonTile extends StatelessWidget {
  const _SoonTile({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      enabled: false,
      leading: Icon(icon, color: AppColors.neutral400),
      title: Text(label),
      trailing: const Chip(
        label: Text('Bientôt'),
        backgroundColor: AppColors.primaryLight,
        labelStyle: TextStyle(
          color: AppColors.primaryDark,
          fontWeight: FontWeight.w600,
          fontSize: 11,
        ),
        side: BorderSide.none,
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}
