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

  /// Détail d'un produit (champs complets : prix, notes, date d'ajout…).
  Future<Product> getProduct(String id) async {
    final res = await _dio.get('/products/$id');
    return Product.fromJson(res.data as Map<String, dynamic>);
  }

  Future<List<Location>> getLocations() async {
    final res = await _dio.get('/locations');
    return (res.data as List)
        .map((e) => Location.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Category>> getCategories() async {
    final res = await _dio.get('/categories');
    return (res.data as List)
        .map((e) => Category.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Crée un produit. Le backend renvoie le produit complet (201) ; on n'en a
  /// pas besoin ici (la liste est rechargée par l'appelant).
  Future<void> createProduct(ProductInput input) async {
    await _dio.post('/products', data: input.toJson());
  }
}

final inventoryRepositoryProvider = Provider<InventoryRepository>(
  (ref) => InventoryRepository(ref.watch(dioProvider)),
);
