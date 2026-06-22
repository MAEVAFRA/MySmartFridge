import 'package:flutter/material.dart';

import '../../shell/presentation/coming_soon_screen.dart';

class ScannerScreen extends StatelessWidget {
  const ScannerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ComingSoonScreen(
      title: 'Scanner',
      icon: Icons.qr_code_scanner,
      message:
          'Scan d\'un code-barre ou d\'un ticket de caisse pour ajouter tes produits.',
    );
  }
}
