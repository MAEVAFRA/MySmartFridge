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

/// Cochage effectué localement mais pas encore confirmé par le serveur (SHOP-8).
/// Persisté pour survivre à un redémarrage hors ligne, puis rejoué au retour du
/// réseau. La clé de la file est l'`id` de l'article ; on conserve ici le
/// `listId` (nécessaire à la requête de synchronisation) et l'état voulu.
class PendingCheck {
  const PendingCheck({required this.listId, required this.checked});

  final String listId;
  final bool checked;

  Map<String, dynamic> toJson() => {'list_id': listId, 'checked': checked};

  factory PendingCheck.fromJson(Map<String, dynamic> json) {
    return PendingCheck(
      listId: json['list_id'].toString(),
      checked: json['checked'] == true,
    );
  }
}

/// Résultat d'un ajout d'articles depuis l'inventaire (SHOP-6) : combien ont été
/// ajoutés et combien ont été ignorés (déjà présents dans la liste).
class InventoryAddResult {
  const InventoryAddResult({required this.added, required this.skipped});

  final int added;
  final int skipped;

  factory InventoryAddResult.fromJson(Map<String, dynamic> json) {
    return InventoryAddResult(
      added: (json['added'] as num?)?.toInt() ?? 0,
      skipped: (json['skipped'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Résultat d'un transfert des articles cochés vers le stock (SHOP-7) : combien
/// de produits ont été créés et dans quel emplacement.
class TransferResult {
  const TransferResult({required this.transferred, this.location});

  final int transferred;
  final String? location;

  factory TransferResult.fromJson(Map<String, dynamic> json) {
    return TransferResult(
      transferred: (json['transferred'] as num?)?.toInt() ?? 0,
      location: json['location'] as String?,
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
