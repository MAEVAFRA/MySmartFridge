import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/token_storage.dart';
import '../data/auth_repository.dart';
import '../domain/auth_models.dart';

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
  Future<void> _loadSession() async {
    if (!await _tokenStorage.hasToken()) {
      state = const AuthUnauthenticated();
      return;
    }
    try {
      state = AuthAuthenticated(await _repo.me());
    } catch (_) {
      await _tokenStorage.clearToken();
      state = const AuthUnauthenticated();
    }
  }

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

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthUnauthenticated();
  }

  Future<String> forgotPassword(String email) => _repo.forgotPassword(email);
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);
