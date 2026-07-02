// `Category` est masqué : le modèle métier `Category` (inventory) prime sur
// l'annotation homonyme de foundation, utilisée dans les routes de catégories.
import 'package:flutter/foundation.dart' hide Category;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/domain/auth_models.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/expiring/presentation/expiring_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/inventory/domain/inventory_models.dart';
import '../../features/inventory/presentation/categories_screen.dart';
import '../../features/inventory/presentation/category_detail_screen.dart';
import '../../features/inventory/presentation/inventory_screen.dart';
import '../../features/inventory/presentation/location_detail_screen.dart';
import '../../features/inventory/presentation/locations_screen.dart';
import '../../features/inventory/presentation/product_detail_screen.dart';
import '../../features/more/presentation/more_screen.dart';
import '../../features/profile/presentation/change_password_screen.dart';
import '../../features/profile/presentation/edit_profile_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/scanner/presentation/scanner_screen.dart';
import '../../features/settings/presentation/api_settings_screen.dart';
import '../../features/settings/presentation/app_settings_screen.dart';
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
const _expiring = '/expiring';
const _shopping = '/shopping';
const _more = '/more';
const _serverSettings = '/server-settings';
const _locations = '/locations';
const _categories = '/categories';
const _profile = '/profile';
const _changePassword = '/change-password';
const _settings = '/settings';

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

      // L'écran de réglages du serveur reste accessible déconnecté : sans lui,
      // impossible de corriger une mauvaise URL d'API pour pouvoir se connecter.
      if (loc == _serverSettings) return null;

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

      // Scanner : route plein écran poussée par-dessus la coquille (la caméra
      // n'est ainsi active que pendant le scan, et la barre d'onglets masquée).
      GoRoute(
          path: _scan,
          name: 'scan',
          builder: (_, _) => const ScannerScreen()),

      // Réglages du serveur : route plein écran, accessible connecté ou non.
      GoRoute(
          path: _serverSettings,
          name: 'server-settings',
          builder: (_, _) => const ApiSettingsScreen()),

      // Profil (PROF-1) + édition (PROF-2/3) en enfant, poussés depuis « Plus ».
      GoRoute(
        path: _profile,
        name: 'profile',
        builder: (_, _) => const ProfileScreen(),
        routes: [
          GoRoute(
            path: 'edit',
            name: 'edit-profile',
            builder: (_, state) => EditProfileScreen(
              initial: state.extra is User ? state.extra as User : null,
            ),
          ),
        ],
      ),

      // Changement de mot de passe (PROF-4).
      GoRoute(
          path: _changePassword,
          name: 'change-password',
          builder: (_, _) => const ChangePasswordScreen()),

      // Paramètres de l'app : thème, langue, à propos (MORE-3).
      GoRoute(
          path: _settings,
          name: 'settings',
          builder: (_, _) => const AppSettingsScreen()),

      // Emplacements (INV-12/13) : route plein écran poussée depuis « Plus ».
      // La fiche produit est un enfant pour rester sur le navigateur racine.
      GoRoute(
        path: _locations,
        name: 'locations',
        builder: (_, _) => const LocationsScreen(),
        routes: [
          GoRoute(
            path: ':id',
            name: 'location-detail',
            builder: (_, state) => LocationDetailScreen(
              locationId: state.pathParameters['id']!,
              initial:
                  state.extra is Location ? state.extra as Location : null,
            ),
            routes: [
              GoRoute(
                path: 'product/:pid',
                name: 'location-product-detail',
                builder: (_, state) => ProductDetailScreen(
                  productId: state.pathParameters['pid']!,
                  initial:
                      state.extra is Product ? state.extra as Product : null,
                ),
              ),
            ],
          ),
        ],
      ),

      // Catégories (INV-14/15) : route plein écran poussée depuis « Plus ».
      GoRoute(
        path: _categories,
        name: 'categories',
        builder: (_, _) => const CategoriesScreen(),
        routes: [
          GoRoute(
            path: ':id',
            name: 'category-detail',
            builder: (_, state) => CategoryDetailScreen(
              categoryId: state.pathParameters['id']!,
              initial:
                  state.extra is Category ? state.extra as Category : null,
            ),
            routes: [
              GoRoute(
                path: 'product/:pid',
                name: 'category-product-detail',
                builder: (_, state) => ProductDetailScreen(
                  productId: state.pathParameters['pid']!,
                  initial:
                      state.extra is Product ? state.extra as Product : null,
                ),
              ),
            ],
          ),
        ],
      ),

      // Péremptions (EXP-1/EXP-2) : route plein écran poussée depuis « Plus ».
      // La fiche produit est un enfant pour rester sur le navigateur racine
      // (pas de saut de branche du shell depuis un écran hors coquille).
      GoRoute(
        path: _expiring,
        name: 'expiring',
        builder: (_, _) => const ExpiringScreen(),
        routes: [
          GoRoute(
            path: 'product/:id',
            name: 'expiring-product-detail',
            builder: (_, state) => ProductDetailScreen(
              productId: state.pathParameters['id']!,
              initial:
                  state.extra is Product ? state.extra as Product : null,
            ),
          ),
        ],
      ),

      // Coquille connectée à onglets persistants (Accueil · Inventaire ·
      // Courses · Plus ; le Scanner central pousse la route ci-dessus).
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
              builder: (_, _) => const InventoryScreen(),
              routes: [
                GoRoute(
                  path: 'product/:id',
                  name: 'product-detail',
                  builder: (_, state) => ProductDetailScreen(
                    productId: state.pathParameters['id']!,
                    initial: state.extra is Product
                        ? state.extra as Product
                        : null,
                  ),
                ),
              ],
            ),
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
