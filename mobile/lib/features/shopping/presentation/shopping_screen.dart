import 'package:flutter/material.dart';

import '../../shell/presentation/coming_soon_screen.dart';

class ShoppingScreen extends StatelessWidget {
  const ShoppingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ComingSoonScreen(
      title: 'Courses',
      icon: Icons.shopping_cart_outlined,
      message: 'Tes listes de courses partagées, cochables en magasin.',
    );
  }
}
