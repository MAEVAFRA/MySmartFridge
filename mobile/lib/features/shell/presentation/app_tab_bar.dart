import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Barre de navigation basse, calée sur le design system (composant TabBar) :
/// 5 onglets + bouton central « Scanner » surélevé.
class AppTabBar extends StatelessWidget {
  const AppTabBar({super.key, required this.currentIndex, required this.onTap});

  final int currentIndex;
  final ValueChanged<int> onTap;

  static const List<_TabSpec> _tabs = [
    _TabSpec('Accueil', Icons.kitchen),
    _TabSpec('Inventaire', Icons.inventory_2_outlined),
    _TabSpec('Scanner', Icons.qr_code_scanner, isFab: true),
    _TabSpec('Courses', Icons.shopping_cart_outlined),
    _TabSpec('Plus', Icons.menu),
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
              for (var i = 0; i < _tabs.length; i++)
                Expanded(
                  child: _tabs[i].isFab
                      ? _FabTab(
                          spec: _tabs[i],
                          onTap: () => onTap(i),
                        )
                      : _NavTab(
                          spec: _tabs[i],
                          active: i == currentIndex,
                          onTap: () => onTap(i),
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
  const _TabSpec(this.label, this.icon, {this.isFab = false});
  final String label;
  final IconData icon;
  final bool isFab;
}
