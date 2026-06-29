// Modèles du domaine « Listes de courses » (parité avec l'API `shopping-lists`).

/// Un article d'une liste de courses.
class ShoppingItem {
  const ShoppingItem({
    required this.id,
    required this.listId,
    required this.name,
    required this.checked,
    this.quantity,
    this.unit,
    this.categoryId,
    this.estimatedPrice,
    this.notes,
    this.productId,
  });

  final String id;
  final String listId;
  final String name;
  final bool checked;
  final num? quantity;
  final String? unit;
  final String? categoryId;
  final num? estimatedPrice;
  final String? notes;

  /// Lien optionnel vers un produit du stock (article ajouté depuis l'inventaire).
  final String? productId;

  factory ShoppingItem.fromJson(Map<String, dynamic> json) {
    return ShoppingItem(
      id: json['id'].toString(),
      listId: json['list_id'].toString(),
      name: json['name'] as String? ?? '',
      checked: json['checked'] == true,
      quantity: json['quantity'] as num?,
      unit: json['unit'] as String?,
      categoryId: json['category_id']?.toString(),
      estimatedPrice: json['estimated_price'] as num?,
      notes: json['notes'] as String?,
      productId: json['product_id']?.toString(),
    );
  }
}

/// Une liste de courses et ses articles.
class ShoppingList {
  const ShoppingList({
    required this.id,
    required this.name,
    required this.items,
    this.isDefault = false,
    this.displayOrder = 0,
  });

  final String id;
  final String name;
  final List<ShoppingItem> items;
  final bool isDefault;
  final int displayOrder;

  /// Nombre d'articles cochés.
  int get checkedCount => items.where((i) => i.checked).length;

  /// Nombre total d'articles.
  int get totalCount => items.length;

  factory ShoppingList.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    return ShoppingList(
      id: json['id'].toString(),
      name: json['name'] as String? ?? 'Liste de courses',
      isDefault: json['is_default'] == true,
      displayOrder: (json['display_order'] as num?)?.toInt() ?? 0,
      items: rawItems is List
          ? rawItems
              .map((e) => ShoppingItem.fromJson(e as Map<String, dynamic>))
              .toList()
          : const [],
    );
  }
}
