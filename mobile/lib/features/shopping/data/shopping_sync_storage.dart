import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/network/api_client.dart';
import '../domain/shopping_models.dart';

/// Persistance de la file des cochages hors ligne (SHOP-8).
///
/// On réutilise [FlutterSecureStorage], déjà câblé pour le token, plutôt que
/// d'ajouter une dépendance (shared_preferences) pour une poignée d'entrées : la
/// file est stockée en un seul blob JSON `{ itemId: {list_id, checked} }`.
class ShoppingSyncStorage {
  ShoppingSyncStorage(this._storage);

  final FlutterSecureStorage _storage;

  static const String _kPendingChecksKey = 'shopping_pending_checks';

  /// Lit la file persistée (map `itemId → PendingCheck`). Renvoie une map vide en
  /// l'absence de données ou si le contenu est illisible (corrompu).
  Future<Map<String, PendingCheck>> readPendingChecks() async {
    final raw = await _storage.read(key: _kPendingChecksKey);
    if (raw == null || raw.isEmpty) return {};
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return decoded.map(
        (id, value) =>
            MapEntry(id, PendingCheck.fromJson(value as Map<String, dynamic>)),
      );
    } catch (_) {
      // Contenu corrompu : on repart d'une file propre plutôt que de planter.
      await _storage.delete(key: _kPendingChecksKey);
      return {};
    }
  }

  /// Écrit la file. Une file vide efface la clé pour ne rien laisser traîner.
  Future<void> writePendingChecks(Map<String, PendingCheck> pending) async {
    if (pending.isEmpty) {
      await _storage.delete(key: _kPendingChecksKey);
      return;
    }
    final encoded = jsonEncode(
      pending.map((id, check) => MapEntry(id, check.toJson())),
    );
    await _storage.write(key: _kPendingChecksKey, value: encoded);
  }
}

final shoppingSyncStorageProvider = Provider<ShoppingSyncStorage>(
  (ref) => ShoppingSyncStorage(ref.read(secureStorageProvider)),
);
