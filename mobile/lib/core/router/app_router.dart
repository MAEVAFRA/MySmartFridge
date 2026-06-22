import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/splash/splash_screen.dart';

const _splash = '/splash';
const _login = '/login';
const _register = '/register';
const _forgot = '/forgot-password';
const _home = '/home';

const _authRoutes = {_login, _register, _forgot};

/// Routeur de l'application, piloté par l'état d'authentification.
///
/// La redirection envoie l'utilisateur vers la connexion ou l'accueil selon
/// qu'il est connecté ou non ; les onglets principaux seront ajoutés ensuite.
final goRouterProvider = Provider<GoRouter>((ref) {
  // Pont entre l'état Riverpod et le `refreshListenable` de go_router :
  // à chaque changement d'état d'auth, on relance la redirection.
  final refresh = ValueNotifier<AuthState>(const AuthUnknown());
  ref.onDispose(refresh.dispose);
  ref.listen<AuthState>(
    authControllerProvider,
    (_, next) => refresh.value = next,
    fireImmediately: true,
  );

  return GoRouter(
    initialLocation: _splash,
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final loc = state.matchedLocation;

      // Session encore inconnue : on reste sur le splash.
      if (auth is AuthUnknown) {
        return loc == _splash ? null : _splash;
      }

      final loggedIn = auth is AuthAuthenticated;
      if (!loggedIn) {
        return _authRoutes.contains(loc) ? null : _login;
      }

      // Connecté : on quitte le splash et les écrans d'auth.
      if (loc == _splash || _authRoutes.contains(loc)) {
        return _home;
      }
      return null;
    },
    routes: [
      GoRoute(
          path: _splash,
          name: 'splash',
          builder: (_, _) => const SplashScreen()),
      GoRoute(
          path: _login, name: 'login', builder: (_, _) => const LoginScreen()),
      GoRoute(
          path: _register,
          name: 'register',
          builder: (_, _) => const RegisterScreen()),
      GoRoute(
          path: _forgot,
          name: 'forgot-password',
          builder: (_, _) => const ForgotPasswordScreen()),
      GoRoute(
          path: _home, name: 'home', builder: (_, _) => const HomeScreen()),
    ],
  );
});
