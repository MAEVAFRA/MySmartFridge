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

  /// Modifie un produit existant (INV-7). Le backend renvoie le produit à jour
  /// (emplacement/catégorie inclus) ; on le retourne pour l'appelant.
  Future<Product> updateProduct(String id, ProductInput input) async {
    final res = await _dio.put('/products/$id', data: input.toUpdateJson());
    return Product.fromJson(res.data as Map<String, dynamic>);
  }

  /// Retire un produit du stock (INV-8, soft delete côté serveur). Le [reason]
  /// optionnel (`consumed` / `thrown`) est journalisé pour alimenter les
  /// statistiques de gaspillage ; `null` = simple retrait sans comptage.
  Future<void> deleteProduct(String id, {ProductRemovalReason? reason}) async {
    await _dio.delete(
      '/products/$id',
      data: reason != null ? {'reason': reason.apiValue} : null,
    );
  }

  // --- Emplacements (INV-12/13) ---

  /// Détail d'un emplacement avec ses produits (`GET /locations/:id`).
  Future<LocationDetail> getLocation(String id) async {
    final res = await _dio.get('/locations/$id');
    return LocationDetail.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Location> createLocation(LocationInput input) async {
    final res = await _dio.post('/locations', data: input.toJson());
    return Location.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Location> updateLocation(String id, LocationInput input) async {
    final res = await _dio.put('/locations/$id', data: input.toJson());
    return Location.fromJson(res.data as Map<String, dynamic>);
  }

  /// Supprime un emplacement. Les produits rattachés sont détachés côté serveur
  /// (`location_id = null`), pas supprimés.
  Future<void> deleteLocation(String id) async {
    await _dio.delete('/locations/$id');
  }
}

final inventoryRepositoryProvider = Provider<InventoryRepository>(
  (ref) => InventoryRepository(ref.watch(dioProvider)),
);
