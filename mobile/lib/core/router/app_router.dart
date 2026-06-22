import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/inventory/presentation/inventory_screen.dart';
import '../../features/more/presentation/more_screen.dart';
import '../../features/scanner/presentation/scanner_screen.dart';
import '../../features/shell/presentation/app_shell.dart';
import '../../features/shopping/presentation/shopping_screen.dart';
import '../../features/splash/splash_screen.dart';

const _splash = '/splash';
const _login = '/login';
const _register = '/register';
const _forgot = '/forgot-password';
const _home = '/home';
const _inventory = '/inventory';
const _scan = '/scan';
const _shopping = '/shopping';
const _more = '/more';

const _authRoutes = {_login, _register, _forgot};

/// Routeur de l'application, piloté par l'état d'authentification.
///
/// Une fois connecté, l'utilisateur arrive dans une coquille (`AppShell`) à
/// 5 onglets persistants (Accueil · Inventaire · Scanner · Courses · Plus).
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

      // Coquille connectée à 5 onglets persistants.
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
                path: _home,
                name: 'home',
                builder: (_, _) => const HomeScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: _inventory,
                name: 'inventory',
                builder: (_, _) => const InventoryScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: _scan,
                name: 'scan',
                builder: (_, _) => const ScannerScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: _shopping,
                name: 'shopping',
                builder: (_, _) => const ShoppingScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: _more,
                name: 'more',
                builder: (_, _) => const MoreScreen()),
          ]),
        ],
      ),
    ],
  );
});
