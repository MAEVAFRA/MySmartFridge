import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../domain/scan_models.dart';

/// Erreur de lookup code-barre dont le [message] est déjà présentable à
/// l'utilisateur (autre cause que « produit inconnu », qui est signalé par un
/// retour `null` de [ScanRepository.lookupBarcode]).
class ScanException implements Exception {
  const ScanException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Accès au proxy Open Food Facts exposé par le backend : recherche d'un
/// produit à partir de son code-barre.
class ScanRepository {
  ScanRepository(this._dio);

  final Dio _dio;

  /// Cherche un produit via `GET /products/barcode/:barcode`.
  ///
  /// - Retourne un [BarcodeLookup] si Open Food Facts connaît le code-barre.
  /// - Retourne `null` si le code-barre est valide mais inconnu (404) : le flux
  ///   appelant pré-remplira alors le formulaire avec le seul code-barre.
  /// - Lève [ScanException] (message présentable) pour toute autre erreur :
  ///   code invalide (400), service indisponible (502), timeout (504) ou
  ///   coupure réseau.
  Future<BarcodeLookup?> lookupBarcode(String barcode) async {
    try {
      final res = await _dio.get('/products/barcode/$barcode');
      return BarcodeLookup.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw ScanException(_messageFor(e));
    }
  }

  String _messageFor(DioException e) {
    switch (e.response?.statusCode) {
      case 400:
        return 'Code-barre invalide.';
      case 502:
        return 'Service Open Food Facts indisponible. '
            'Réessaie ou saisis le produit manuellement.';
      case 504:
        return 'Open Food Facts ne répond pas. Réessaie.';
    }
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.connectionError:
        return 'Pas de connexion. Vérifie ton réseau et réessaie.';
      default:
        return 'Recherche impossible. Réessaie ou saisis le produit manuellement.';
    }
  }
}

final scanRepositoryProvider = Provider<ScanRepository>(
  (ref) => ScanRepository(ref.watch(dioProvider)),
);
