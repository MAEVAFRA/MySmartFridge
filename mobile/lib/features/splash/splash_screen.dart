import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// Écran de démarrage affiché pendant la lecture du token.
///
/// La navigation est gérée par le routeur selon l'état d'authentification
/// (voir `goRouterProvider`).
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.kitchen, size: 64, color: AppColors.primary),
            SizedBox(height: 16),
            Text(
              'MySmartFridge',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            SizedBox(height: 24),
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
          ],
        ),
      ),
    );
  }
}
