import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persistance des réglages applicatifs non sensibles (URL du backend, thème).
///
/// On réutilise [FlutterSecureStorage] déjà câblé pour le token : ces valeurs
/// ne sont pas des secrets, mais cela évite d'ajouter une dépendance
/// (shared_preferences) juste pour elles.
class SettingsStorage {
  SettingsStorage(this._storage);

  final FlutterSecureStorage _storage;

  static const String _kApiBaseUrlKey = 'api_base_url';
  static const String _kThemeModeKey = 'theme_mode';

  Future<void> writeApiBaseUrl(String url) =>
      _storage.write(key: _kApiBaseUrlKey, value: url);

  Future<String?> readApiBaseUrl() => _storage.read(key: _kApiBaseUrlKey);

  Future<void> clearApiBaseUrl() => _storage.delete(key: _kApiBaseUrlKey);

  /// Mode de thème persisté : `'light'`, `'dark'` ou `'system'` (MORE-3).
  Future<void> writeThemeMode(String mode) =>
      _storage.write(key: _kThemeModeKey, value: mode);

  Future<String?> readThemeMode() => _storage.read(key: _kThemeModeKey);
}
