import 'package:flutter/material.dart';

import '../../shell/presentation/coming_soon_screen.dart';

class InventoryScreen extends StatelessWidget {
  const InventoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ComingSoonScreen(
      title: 'Inventaire',
      icon: Icons.inventory_2_outlined,
      message:
          'La liste de tes produits, avec recherche, tri et filtres, arrive ici.',
    );
  }
}
