import 'package:go_router/go_router.dart';

import '../../features/home/home_screen.dart';
import '../../features/splash/splash_screen.dart';

/// Configuration de navigation de l'application.
///
/// Les routes d'authentification (connexion, inscription, mot de passe oublié) et
/// les onglets principaux (Accueil, Inventaire, Scanner, Courses, Plus) seront
/// ajoutés au fil des tickets.
final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      name: 'splash',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/home',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
    ),
  ],
);
