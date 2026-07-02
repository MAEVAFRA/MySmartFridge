import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/async_state_views.dart';
import '../../auth/domain/auth_models.dart';
import '../application/profile_providers.dart';
import 'widgets/profile_avatar.dart';

/// PROF-1 — Affichage du profil : identité, photo, régimes/allergies, et accès
/// à l'édition (PROF-2/3) et au changement de mot de passe (PROF-4).
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon profil',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: profile.when(
        loading: () => const LoadingView(),
        error: (_, _) => ErrorRetryView(
          title: 'Impossible de charger le profil',
          onRetry: () => ref.invalidate(profileProvider),
        ),
        data: (user) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(profileProvider);
            await ref.read(profileProvider.future);
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Header(user: user),
              const SizedBox(height: 20),
              _TagsCard(
                icon: Icons.restaurant_menu,
                title: 'Préférences alimentaires',
                emptyLabel: 'Aucune préférence renseignée',
                values: _splitCsv(user.dietaryPreferences),
              ),
              const SizedBox(height: 12),
              _TagsCard(
                icon: Icons.health_and_safety_outlined,
                title: 'Allergies',
                emptyLabel: 'Aucune allergie renseignée',
                values: _splitCsv(user.allergies),
              ),
              const SizedBox(height: 20),
              _SecuritySection(),
            ],
          ),
        ),
      ),
    );
  }
}

/// Découpe un texte libre séparé par des virgules en étiquettes nettoyées.
List<String> _splitCsv(String? raw) {
  if (raw == null) return const [];
  return raw
      .split(',')
      .map((e) => e.trim())
      .where((e) => e.isNotEmpty)
      .toList();
}

class _Header extends StatelessWidget {
  const _Header({required this.user});

  final User user;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ProfileAvatar(avatarUrl: user.avatarUrl, name: user.name, radius: 48),
        const SizedBox(height: 14),
        Text(
          user.name.isEmpty ? 'Profil' : user.name,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 2),
        Text(
          user.email,
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
        ),
        const SizedBox(height: 16),
        FilledButton.tonalIcon(
          onPressed: () => context.push('/profile/edit', extra: user),
          icon: const Icon(Icons.edit_outlined, size: 18),
          label: const Text('Modifier le profil'),
        ),
      ],
    );
  }
}

/// Carte listant des étiquettes (régimes, allergies) ou un message si vide.
class _TagsCard extends StatelessWidget {
  const _TagsCard({
    required this.icon,
    required this.title,
    required this.emptyLabel,
    required this.values,
  });

  final IconData icon;
  final String title;
  final String emptyLabel;
  final List<String> values;

  @override
  Widget build(BuildContext context) {
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
          Row(
            children: [
              Icon(icon, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (values.isEmpty)
            Text(
              emptyLabel,
              style: const TextStyle(color: AppColors.textSecondary),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final value in values)
                  Chip(
                    label: Text(value),
                    backgroundColor: AppColors.primaryLight,
                    labelStyle: const TextStyle(
                      color: AppColors.primaryDark,
                      fontWeight: FontWeight.w600,
                    ),
                    side: BorderSide.none,
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _SecuritySection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        leading: const Icon(Icons.lock_outline, color: AppColors.primary),
        title: const Text('Changer le mot de passe'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/change-password'),
      ),
    );
  }
}
