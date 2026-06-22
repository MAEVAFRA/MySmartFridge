import 'package:flutter/material.dart';

import '../../shell/presentation/coming_soon_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ComingSoonScreen(
      title: 'Plus',
      icon: Icons.menu,
      message: 'Recettes, dépenses & budget, statistiques, foyer et profil.',
    );
  }
}
