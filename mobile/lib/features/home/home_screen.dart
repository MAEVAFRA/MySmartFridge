import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../auth/application/auth_controller.dart';

/// Écran d'accueil (placeholder).
///
/// Sera remplacé par le tableau de bord : « à consommer vite », résumé du stock,
/// accès rapides (scanner, ajouter, courses), suggestion de recette anti-gaspi.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final name = auth is AuthAuthenticated ? auth.user.name : '';

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'MySmartFridge',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            tooltip: 'Déconnexion',
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(Icons.kitchen,
                    size: 44, color: AppColors.primary),
              ),
              const SizedBox(height: 20),
              Text(
                name.isEmpty ? 'Bonjour 👋' : 'Bonjour $name 👋',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Tu es connecté à ton compte.\n'
                'Prochaine étape : les onglets (Inventaire, Scanner, Courses…).',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, height: 1.4),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
