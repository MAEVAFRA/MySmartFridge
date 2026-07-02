import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Plus', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.dns_outlined, color: AppColors.primary),
            title: const Text('Serveur / API'),
            subtitle: const Text('Adresse du backend'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/server-settings'),
          ),
          const Divider(height: 1),
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
          const _SoonTile(icon: Icons.person_outline, label: 'Profil'),
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
