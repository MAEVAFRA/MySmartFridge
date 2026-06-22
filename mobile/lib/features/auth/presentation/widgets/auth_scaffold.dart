import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// Mise en page commune aux écrans d'authentification : logo + titre +
/// sous-titre, puis le contenu (formulaire) dans une carte centrée.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.subtitle, required this.child});

  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(Icons.kitchen,
                          size: 38, color: AppColors.primary),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'MySmartFridge',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 15),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: child,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
