import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../core/config/app_info.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';

/// Version/build de l'app, lue à l'exécution pour l'écran « À propos ».
final _packageInfoProvider =
    FutureProvider<PackageInfo>((ref) => PackageInfo.fromPlatform());

/// MORE-3 — Paramètres de l'application : apparence (thème clair/sombre/système,
/// persisté), langue (français ; l'i18n complète viendra avec I18N-1), et
/// « À propos » (nom, version, description).
class AppSettingsScreen extends ConsumerWidget {
  const AppSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Paramètres',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          const _SectionLabel('Apparence'),
          _Card(
            child: Column(
              children: [
                _ThemeOption(
                  icon: Icons.brightness_auto_outlined,
                  title: 'Système',
                  subtitle: "Suit le réglage de l'appareil",
                  selected: mode == ThemeMode.system,
                  onTap: () => _setMode(ref, ThemeMode.system),
                ),
                const _RowDivider(),
                _ThemeOption(
                  icon: Icons.light_mode_outlined,
                  title: 'Clair',
                  selected: mode == ThemeMode.light,
                  onTap: () => _setMode(ref, ThemeMode.light),
                ),
                const _RowDivider(),
                _ThemeOption(
                  icon: Icons.dark_mode_outlined,
                  title: 'Sombre',
                  selected: mode == ThemeMode.dark,
                  onTap: () => _setMode(ref, ThemeMode.dark),
                ),
              ],
            ),
          ),
          const _SectionLabel('Langue'),
          _Card(
            child: ListTile(
              leading: const Icon(Icons.translate, color: AppColors.primary),
              title: const Text('Langue'),
              subtitle: const Text("D'autres langues seront disponibles bientôt"),
              trailing: const Chip(
                label: Text('Français'),
                backgroundColor: AppColors.primaryLight,
                labelStyle: TextStyle(
                  color: AppColors.primaryDark,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
                side: BorderSide.none,
                visualDensity: VisualDensity.compact,
              ),
            ),
          ),
          const _SectionLabel('À propos'),
          _Card(child: _AboutContent()),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  void _setMode(WidgetRef ref, ThemeMode mode) =>
      ref.read(themeModeProvider.notifier).set(mode);
}

/// Intitulé de section (gris, en tête d'un groupe de réglages).
class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.textSecondary,
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
      ),
    );
  }
}

/// Carte-conteneur d'un groupe de réglages.
class _Card extends StatelessWidget {
  const _Card({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }
}

class _RowDivider extends StatelessWidget {
  const _RowDivider();

  @override
  Widget build(BuildContext context) =>
      const Divider(height: 1, indent: 56, color: AppColors.border);
}

/// Ligne d'option de thème avec coche sur l'élément sélectionné.
class _ThemeOption extends StatelessWidget {
  const _ThemeOption({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon,
          color: selected ? AppColors.primary : AppColors.textSecondary),
      title: Text(title,
          style: TextStyle(
              fontWeight: selected ? FontWeight.w600 : FontWeight.normal)),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      trailing: selected
          ? const Icon(Icons.check, color: AppColors.primary)
          : null,
      onTap: onTap,
    );
  }
}

/// Contenu de la carte « À propos » : logo, nom, version, description.
class _AboutContent extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final info = ref.watch(_packageInfoProvider);
    final version = info.maybeWhen(
      data: (i) => 'Version ${i.version} (build ${i.buildNumber})',
      orElse: () => 'Version…',
    );

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.kitchen_outlined,
                    color: AppColors.primaryDark, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AppInfo.name,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      version,
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Text(
            AppInfo.tagline,
            style: TextStyle(color: AppColors.textSecondary, height: 1.4),
          ),
          const SizedBox(height: 14),
          const Text(
            AppInfo.legal,
            style: TextStyle(color: AppColors.neutral400, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
