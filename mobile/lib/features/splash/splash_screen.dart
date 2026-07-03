import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';

/// Écran de démarrage affiché pendant la lecture du token / la validation de la
/// session. La navigation est pilotée par le routeur selon l'état
/// d'authentification (voir `goRouterProvider`).
///
/// SPLASH-1 — filet de sécurité : si l'attente s'éternise (Keystore lent,
/// backend injoignable, mauvaise URL d'API), on révèle après quelques secondes
/// un message rassurant + un raccourci vers les réglages serveur, plutôt que de
/// laisser l'utilisateur devant un spinner muet. La lecture du Keystore et
/// l'appel `/auth/me` sont par ailleurs bornés côté contrôleur/Dio, donc l'état
/// finit toujours par se résoudre.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  static const _hintDelay = Duration(seconds: 6);

  Timer? _timer;
  bool _showFallback = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer(_hintDelay, () {
      if (mounted) setState(() => _showFallback = true);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.kitchen, size: 64, color: AppColors.primary),
            const SizedBox(height: 16),
            const Text(
              'MySmartFridge',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 24),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
            // Révélé seulement si le démarrage traîne (SPLASH-1).
            AnimatedOpacity(
              opacity: _showFallback ? 1 : 0,
              duration: const Duration(milliseconds: 300),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(32, 28, 32, 0),
                child: Column(
                  children: [
                    const Text(
                      'Ça prend plus de temps que prévu…',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 8),
                    TextButton.icon(
                      // Ignoré tant que le fallback est masqué (évite un appui
                      // fantôme derrière l'opacité 0).
                      onPressed: _showFallback
                          ? () => context.push('/server-settings')
                          : null,
                      icon: const Icon(Icons.dns_outlined, size: 18),
                      label: const Text('Vérifier l\'adresse du serveur'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
