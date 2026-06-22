import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Petit wrapper autour de [FlutterSecureStorage] pour gérer le token JWT.
///
/// Le token est stocké dans le Keychain (iOS) / Keystore (Android), pas en clair.
class TokenStorage {
  TokenStorage(this._storage);

  final FlutterSecureStorage _storage;

  static const String _kTokenKey = 'jwt_token';

  Future<void> saveToken(String token) =>
      _storage.write(key: _kTokenKey, value: token);

  Future<String?> readToken() => _storage.read(key: _kTokenKey);

  Future<void> clearToken() => _storage.delete(key: _kTokenKey);

  Future<bool> hasToken() async {
    final token = await readToken();
    return token != null && token.isNotEmpty;
  }
}
