import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persistance des réglages applicatifs non sensibles (URL du backend).
///
/// On réutilise [FlutterSecureStorage] déjà câblé pour le token : l'URL n'est
/// pas un secret, mais cela évite d'ajouter une dépendance (shared_preferences)
/// juste pour une valeur.
class SettingsStorage {
  SettingsStorage(this._storage);

  final FlutterSecureStorage _storage;

  static const String _kApiBaseUrlKey = 'api_base_url';

  Future<void> writeApiBaseUrl(String url) =>
      _storage.write(key: _kApiBaseUrlKey, value: url);

  Future<String?> readApiBaseUrl() => _storage.read(key: _kApiBaseUrlKey);

  Future<void> clearApiBaseUrl() => _storage.delete(key: _kApiBaseUrlKey);
}
