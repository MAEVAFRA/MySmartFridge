import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/auth/application/auth_controller.dart';
import '../config/env.dart';
import '../storage/token_storage.dart';

/// Stockage sécurisé bas niveau (Keychain iOS / Keystore Android).
final secureStorageProvider = Provider<FlutterSecureStorage>(
  (ref) => const FlutterSecureStorage(),
);

/// Accès au token JWT.
final tokenStorageProvider = Provider<TokenStorage>(
  (ref) => TokenStorage(ref.read(secureStorageProvider)),
);

/// Client HTTP Dio configuré pour l'API backend.
///
/// Un intercepteur injecte automatiquement le token JWT sur chaque requête.
final dioProvider = Provider<Dio>((ref) {
  final tokenStorage = ref.read(tokenStorageProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await tokenStorage.readToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        // Un 401 sur une requête authentifiée = token expiré ou révoqué : on
        // déconnecte globalement (le routeur renvoie vers le login). Les
        // endpoints d'auth publics sont exclus (leur 401 = identifiants
        // invalides, géré par l'écran concerné).
        if (isSessionExpiredError(error)) {
          ref.read(authControllerProvider.notifier).handleUnauthorized();
        }
        handler.next(error);
      },
    ),
  );

  // Journalisation réseau en développement uniquement. On ne logue pas les
  // en-têtes pour éviter d'exposer le token JWT (Authorization: Bearer).
  if (kDebugMode) {
    dio.interceptors.add(
      LogInterceptor(
        request: true,
        requestHeader: false,
        requestBody: false,
        responseHeader: false,
        responseBody: false,
        error: true,
      ),
    );
  }

  return dio;
});

/// Indique si une erreur Dio traduit une session expirée/invalide — un 401 sur
/// une requête *authentifiée* — qui doit déclencher une déconnexion globale.
///
/// Les endpoints d'auth publics (connexion, inscription, mot de passe) sont
/// exclus : leur 401 signifie « identifiants invalides » et doit être affiché
/// par l'écran concerné, pas provoquer une déconnexion.
bool isSessionExpiredError(DioException error) {
  if (error.response?.statusCode != 401) return false;
  final path = error.requestOptions.path;
  const publicAuthPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];
  return !publicAuthPaths.any(path.startsWith);
}
