import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'app_tab_bar.dart';

/// Coquille de l'app connectée : héberge les 5 onglets (via StatefulShellRoute)
/// et la barre de navigation basse persistante.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: AppTabBar(
        currentIndex: navigationShell.currentIndex,
        onTap: (index) => navigationShell.goBranch(
          index,
          // Re-tap sur l'onglet actif → retour à sa racine.
          initialLocation: index == navigationShell.currentIndex,
        ),
        // Le bouton central pousse l'écran de scan plein écran (hors coquille).
        onScan: () => context.pushNamed('scan'),
      ),
    );
  }
}
