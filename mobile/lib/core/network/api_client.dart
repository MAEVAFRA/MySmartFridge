import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/auth/application/auth_controller.dart';
import '../config/env.dart';
import '../storage/settings_storage.dart';
import '../storage/token_storage.dart';

/// Stockage sécurisé bas niveau (Keychain iOS / Keystore Android).
final secureStorageProvider = Provider<FlutterSecureStorage>(
  (ref) => const FlutterSecureStorage(),
);

/// Accès au token JWT.
final tokenStorageProvider = Provider<TokenStorage>(
  (ref) => TokenStorage(ref.read(secureStorageProvider)),
);

/// Persistance des réglages non sensibles (URL du backend).
final settingsStorageProvider = Provider<SettingsStorage>(
  (ref) => SettingsStorage(ref.read(secureStorageProvider)),
);

/// URL de base de l'API, configurable à l'exécution et persistée sur l'appareil.
///
/// Source de vérité du [dioProvider]. Indispensable pour une app installée hors
/// magasin (sideload) : l'adresse du backend dépend du réseau (IP locale du PC,
/// tunnel…) et ne peut donc pas être gravée dans le binaire.
///
/// Valeur initiale : celle enregistrée par l'utilisateur, injectée au démarrage
/// via un override dans `main` ; à défaut, la valeur de compilation
/// [Env.apiBaseUrl].
class ApiBaseUrlController extends Notifier<String> {
  ApiBaseUrlController(this._initial);

  final String _initial;

  @override
  String build() => _initial;

  /// Enregistre puis applique [url] (normalisée). Le [dioProvider] surveille cet
  /// état, donc le changement se propage sans redémarrer l'application.
  Future<void> set(String url) async {
    final normalized = normalizeApiBaseUrl(url);
    await ref.read(settingsStorageProvider).writeApiBaseUrl(normalized);
    state = normalized;
  }

  /// Rétablit l'URL de compilation par défaut ([Env.apiBaseUrl]).
  Future<void> resetToDefault() async {
    await ref.read(settingsStorageProvider).clearApiBaseUrl();
    state = Env.apiBaseUrl;
  }
}

final apiBaseUrlProvider = NotifierProvider<ApiBaseUrlController, String>(
  () => ApiBaseUrlController(Env.apiBaseUrl),
);

/// Normalise une URL saisie : préfixe `http://` si le schéma manque et retire
/// le ou les slash finaux. Renvoie la valeur par défaut si l'entrée est vide.
String normalizeApiBaseUrl(String raw) {
  var url = raw.trim();
  if (url.isEmpty) return Env.apiBaseUrl;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://$url';
  }
  while (url.endsWith('/')) {
    url = url.substring(0, url.length - 1);
  }
  return url;
}

/// Client HTTP Dio configuré pour l'API backend.
///
/// Un intercepteur injecte automatiquement le token JWT sur chaque requête.
final dioProvider = Provider<Dio>((ref) {
  final tokenStorage = ref.read(tokenStorageProvider);
  // On surveille l'URL configurable : la modifier reconstruit le client, et les
  // repositories qui l'observent repartent alors sur le nouveau backend.
  final baseUrl = ref.watch(apiBaseUrlProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
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

/// Indique si une erreur Dio traduit un problème de **connectivité** (appareil
/// hors ligne, backend injoignable, délai dépassé) plutôt qu'une réponse du
/// serveur. Sert au mode hors-ligne des courses (SHOP-8) : un cochage qui échoue
/// pour cette raison est mis en file d'attente au lieu d'être annulé.
bool isNetworkError(DioException error) {
  switch (error.type) {
    case DioExceptionType.connectionError:
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return true;
    case DioExceptionType.unknown:
      // Sur mobile, une coupure réseau remonte souvent en `unknown` enveloppant
      // une `SocketException` : aucune réponse HTTP n'a pu être obtenue.
      return error.error is SocketException;
    default:
      return false;
  }
}
