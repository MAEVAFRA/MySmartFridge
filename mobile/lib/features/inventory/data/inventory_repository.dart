import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../domain/inventory_models.dart';

/// Accès aux endpoints d'inventaire (produits, emplacements) de l'API existante.
///
/// Le foyer actif est résolu côté backend (middleware household : 1er foyer par
/// défaut). Le sélecteur de foyer sera ajouté avec la feature « Foyer ».
class InventoryRepository {
  InventoryRepository(this._dio);

  final Dio _dio;

  Future<List<Product>> getProducts() async {
    final res = await _dio.get('/products');
    return (res.data as List)
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Product>> getExpiring({int days = 7}) async {
    final res = await _dio.get(
      '/products/expiring',
      queryParameters: {'days': days},
    );
    return (res.data as List)
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Location>> getLocations() async {
    final res = await _dio.get('/locations');
    return (res.data as List)
        .map((e) => Location.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

final inventoryRepositoryProvider = Provider<InventoryRepository>(
  (ref) => InventoryRepository(ref.read(dioProvider)),
);
