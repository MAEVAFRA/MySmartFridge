import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/token_storage.dart';
import '../data/auth_repository.dart';
import '../domain/auth_models.dart';
import '../domain/jwt.dart';

/// État d'authentification de l'application.
sealed class AuthState {
  const AuthState();
}

/// État initial : on lit encore le token (écran de démarrage affiché).
class AuthUnknown extends AuthState {
  const AuthUnknown();
}

/// Pas connecté.
class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

/// Connecté.
class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.user);
  final User user;
}

/// Pilote l'état d'authentification : démarrage, connexion, inscription,
/// déconnexion. Les écrans appellent ses méthodes ; le routeur observe l'état.
class AuthController extends Notifier<AuthState> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);
  TokenStorage get _tokenStorage => ref.read(tokenStorageProvider);

  @override
  AuthState build() {
    _loadSession();
    return const AuthUnknown();
  }

  /// Au démarrage : s'il y a un token, on valide la session via /auth/me.
  ///
  /// On distingue soigneusement les cas pour ne pas déconnecter l'utilisateur à
  /// tort : un token rejeté par le serveur (401/403) ou déjà expiré localement
  /// est effacé (vraie déconnexion) ; mais une simple coupure réseau conserve la
  /// session en mode dégradé (identité minimale issue du JWT), le profil complet
  /// étant rechargé via /auth/me au retour de la connexion.
  Future<void> _loadSession() async {
    // SPLASH-1 : on borne la lecture du Keystore. Un accès au stockage sécurisé
    // qui traîne (Keystore lent/verrouillé) laisserait sinon l'app figée sur le
    // splash indéfiniment. Au-delà du délai, on retombe sur « déconnecté » —
    // l'utilisateur voit le login et peut se reconnecter, plutôt que d'attendre
    // sans fin.
    final token = await _tokenStorage
        .readToken()
        .timeout(const Duration(seconds: 5), onTimeout: () => null);
    if (token == null || token.isEmpty) {
      state = const AuthUnauthenticated();
      return;
    }

    final payload = JwtPayload.tryDecode(token);
    if (payload != null && payload.isExpired) {
      await _tokenStorage.clearToken();
      state = const AuthUnauthenticated();
      return;
    }

    try {
      state = AuthAuthenticated(await _repo.me());
    } on DioException catch (e) {
      if (isSessionExpiredError(e)) {
        // Token refusé par le serveur (401) : déconnexion.
        await _tokenStorage.clearToken();
        state = const AuthUnauthenticated();
      } else {
        // Serveur injoignable / timeout / erreur transitoire : on garde la
        // session en mode dégradé plutôt que de déconnecter.
        state = AuthAuthenticated(_degradedUser(payload));
      }
    } catch (_) {
      // Erreur inattendue non réseau (ex : réponse malformée) : on ne déconnecte
      // pas pour autant.
      state = AuthAuthenticated(_degradedUser(payload));
    }
  }

  /// Identité minimale reconstruite depuis le JWT pour le mode dégradé.
  User _degradedUser(JwtPayload? payload) => payload != null
      ? User.fromJwt(payload)
      : const User(id: '', name: '', email: '');

  Future<void> login({required String email, required String password}) async {
    state = AuthAuthenticated(
      await _repo.login(email: email, password: password),
    );
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    state = AuthAuthenticated(
      await _repo.register(name: name, email: email, password: password),
    );
  }

  /// Remplace l'utilisateur courant (après une édition de profil réussie), afin
  /// que le reste de l'app — salutation d'accueil, avatar… — reflète les
  /// changements. Sans effet si l'on n'est pas connecté.
  void setUser(User user) {
    if (state is! AuthAuthenticated) return;
    state = AuthAuthenticated(user);
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthUnauthenticated();
  }

  /// Réagit à un 401 reçu sur une requête authentifiée (token expiré ou
  /// révoqué), depuis l'intercepteur Dio : on bascule en déconnecté — le
  /// routeur renvoie alors vers le login — puis on efface le token
  /// (best-effort). Idempotent : sans effet si déjà déconnecté, car plusieurs
  /// requêtes peuvent échouer en même temps.
  void handleUnauthorized() {
    if (state is AuthUnauthenticated) return;
    state = const AuthUnauthenticated();
    unawaited(_tokenStorage.clearToken());
  }

  Future<String> forgotPassword(String email) => _repo.forgotPassword(email);
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);
