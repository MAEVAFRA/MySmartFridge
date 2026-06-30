import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Barre de navigation basse, calée sur le design system (composant TabBar) :
/// 5 onglets + bouton central « Scanner » surélevé.
class AppTabBar extends StatelessWidget {
  const AppTabBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.onScan,
  });

  /// Index de la branche active du shell (0..3).
  final int currentIndex;

  /// Bascule vers une branche du shell (index de branche).
  final ValueChanged<int> onTap;

  /// Action du bouton central : ouvre l'écran de scan (hors shell).
  final VoidCallback onScan;

  // `branch` = index de la branche du shell (null pour le bouton Scanner, qui
  // pousse une route plein écran au lieu de changer d'onglet).
  static const List<_TabSpec> _tabs = [
    _TabSpec('Accueil', Icons.kitchen, branch: 0),
    _TabSpec('Inventaire', Icons.inventory_2_outlined, branch: 1),
    _TabSpec('Scanner', Icons.qr_code_scanner, isFab: true),
    _TabSpec('Courses', Icons.shopping_cart_outlined, branch: 2),
    _TabSpec('Plus', Icons.menu, branch: 3),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          // shadow-tab-bar : hairline supérieur très discret.
          BoxShadow(color: Color(0x0F0F172A), offset: Offset(0, -1)),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 84,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (final spec in _tabs)
                Expanded(
                  child: spec.isFab
                      ? _FabTab(
                          spec: spec,
                          onTap: onScan,
                        )
                      : _NavTab(
                          spec: spec,
                          active: currentIndex == spec.branch,
                          onTap: () => onTap(spec.branch!),
                        ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavTab extends StatelessWidget {
  const _NavTab({required this.spec, required this.active, required this.onTap});

  final _TabSpec spec;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.primary : AppColors.neutral400;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 40,
              height: 32,
              decoration: BoxDecoration(
                color: active ? AppColors.primaryLight : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(spec.icon, size: 20, color: color),
            ),
            const SizedBox(height: 4),
            Text(
              spec.label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FabTab extends StatelessWidget {
  const _FabTab({required this.spec, required this.onTap});

  final _TabSpec spec;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
                boxShadow: [
                  // shadow-fab : glow bleu.
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.40),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.20),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Icon(spec.icon, color: Colors.white, size: 24),
            ),
            const SizedBox(height: 4),
            const Text(
              'Scanner',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TabSpec {
  const _TabSpec(this.label, this.icon, {this.branch, this.isFab = false});
  final String label;
  final IconData icon;

  /// Index de la branche du shell, ou `null` pour le bouton Scanner central.
  final int? branch;
  final bool isFab;
}
