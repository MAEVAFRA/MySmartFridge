import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../domain/shopping_models.dart';

/// Accès aux endpoints `shopping-lists` de l'API (listes + articles).
/// Le foyer actif est résolu côté backend (1er foyer par défaut).
class ShoppingRepository {
  ShoppingRepository(this._dio);

  final Dio _dio;

  // ─── Listes ─────────────────────────────────────────────────────

  Future<List<ShoppingList>> getLists() async {
    final res = await _dio.get('/shopping-lists');
    return (res.data as List)
        .map((e) => ShoppingList.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Crée une liste et renvoie l'objet créé (pour la sélectionner aussitôt).
  Future<ShoppingList> createList(String name) async {
    final res = await _dio.post('/shopping-lists', data: {'name': name});
    return ShoppingList.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> renameList(String id, String name) async {
    await _dio.put('/shopping-lists/$id', data: {'name': name});
  }

  Future<void> deleteList(String id) async {
    await _dio.delete('/shopping-lists/$id');
  }

  // ─── Articles ───────────────────────────────────────────────────

  Future<void> addItem(
    String listId, {
    required String name,
    num? quantity,
    String? unit,
  }) async {
    await _dio.post('/shopping-lists/$listId/items', data: {
      'name': name,
      'quantity': ?quantity,
      if (unit != null && unit.isNotEmpty) 'unit': unit,
    });
  }

  Future<void> setItemChecked(
      String listId, String itemId, bool checked) async {
    await _dio.put('/shopping-lists/$listId/items/$itemId',
        data: {'checked': checked});
  }

  Future<void> deleteItem(String listId, String itemId) async {
    await _dio.delete('/shopping-lists/$listId/items/$itemId');
  }

  /// Ajoute des articles à la liste depuis des produits du stock (SHOP-6).
  /// [quantities] associe un id produit à la quantité voulue. Le backend recopie
  /// nom/unité/catégorie/code-barre/prix et ignore les produits déjà présents.
  Future<InventoryAddResult> addItemsFromInventory(
    String listId,
    Map<String, num> quantities,
  ) async {
    final items = quantities.entries
        .map((e) => {'product_id': e.key, 'quantity': e.value})
        .toList();
    final res = await _dio.post(
      '/shopping-lists/$listId/items/from-inventory',
      data: {'items': items},
    );
    return InventoryAddResult.fromJson(res.data as Map<String, dynamic>);
  }

  /// Transfère les articles cochés de la liste vers le stock (SHOP-7) : crée les
  /// produits dans [locationId] (ou l'emplacement par défaut si nul), puis les
  /// retire de la liste.
  Future<TransferResult> transferToStock(
    String listId, {
    String? locationId,
  }) async {
    final res = await _dio.post(
      '/shopping-lists/$listId/transfer',
      data: {'location_id': ?locationId},
    );
    return TransferResult.fromJson(res.data as Map<String, dynamic>);
  }
}

final shoppingRepositoryProvider = Provider<ShoppingRepository>(
  (ref) => ShoppingRepository(ref.watch(dioProvider)),
);
