import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/token_storage.dart';
import '../domain/auth_models.dart';

/// Exception métier d'authentification, avec un message prêt à afficher.
class AuthException implements Exception {
  const AuthException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Accès aux endpoints d'authentification de l'API backend.
class AuthRepository {
  AuthRepository(this._dio, this._tokenStorage);

  final Dio _dio;
  final TokenStorage _tokenStorage;

  Future<User> login({required String email, required String password}) async {
    try {
      final res = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      await _tokenStorage.saveToken(res.data['token'] as String);
      return User.fromJson(res.data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  Future<User> register({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      final res = await _dio.post('/auth/register', data: {
        'name': name,
        'email': email,
        'password': password,
      });
      await _tokenStorage.saveToken(res.data['token'] as String);
      return User.fromJson(res.data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  /// Récupère l'utilisateur courant à partir du token stocké.
  Future<User> me() async {
    final res = await _dio.get('/auth/me');
    return User.fromJson(res.data['user'] as Map<String, dynamic>);
  }

  /// Met à jour le profil (nom, email, régimes/allergies, photo) et renvoie
  /// l'utilisateur rafraîchi. Les champs texte vides ou une photo à `null` sont
  /// envoyés tels quels : le backend interprète une chaîne vide comme un
  /// effacement du champ.
  Future<User> updateProfile({
    required String name,
    required String email,
    required String? avatarUrl,
    required String? dietaryPreferences,
    required String? allergies,
  }) async {
    try {
      final res = await _dio.put('/auth/profile', data: {
        'name': name,
        'email': email,
        'avatar_url': avatarUrl ?? '',
        'dietary_preferences': dietaryPreferences ?? '',
        'allergies': allergies ?? '',
      });
      return User.fromJson(res.data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  /// Change le mot de passe. Le backend vérifie le mot de passe actuel.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _dio.put('/auth/password', data: {
        'current_password': currentPassword,
        'new_password': newPassword,
      });
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  /// Demande un email de réinitialisation. Renvoie le message de l'API.
  Future<String> forgotPassword(String email) async {
    try {
      final res =
          await _dio.post('/auth/forgot-password', data: {'email': email});
      return res.data['message'] as String? ??
          "Si un compte existe, un email vient d'être envoyé.";
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  /// Déconnexion : le JWT est stateless côté serveur, on efface le token local.
  Future<void> logout() => _tokenStorage.clearToken();

  /// Extrait un message d'erreur lisible depuis une [DioException].
  String _messageFrom(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.connectionError:
        return 'Impossible de joindre le serveur. Vérifie ta connexion.';
      default:
        return 'Une erreur est survenue. Réessaie.';
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(dioProvider), ref.read(tokenStorageProvider)),
);
