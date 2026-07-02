/// Emplacement de stockage (réfrigérateur, congélateur, placard…).
class Location {
  const Location({
    required this.id,
    required this.name,
    required this.type,
    this.icon,
    this.colorHex,
  });

  final String id;
  final String name;
  final String type; // fridge / freezer / pantry / ...
  final String? icon; // emoji renvoyé par l'API
  final String? colorHex; // ex. "#3b82f6"

  factory Location.fromJson(Map<String, dynamic> json) {
    return Location(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? '',
      icon: json['icon'] as String?,
      colorHex: json['color'] as String?,
    );
  }
}

/// Catégorie de produit (légumes, produits laitiers…).
class Category {
  const Category({
    required this.id,
    required this.name,
    this.icon,
    this.colorHex,
  });

  final String id;
  final String name;
  final String? icon;
  final String? colorHex;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      icon: json['icon'] as String?,
      colorHex: json['color'] as String?,
    );
  }
}

/// Produit en stock. Les champs `location` et `category` sont imbriqués côté API.
class Product {
  const Product({
    required this.id,
    required this.name,
    this.expiresAt,
    this.locationId,
    this.locationName,
    this.locationIcon,
    this.locationColorHex,
    this.locationType,
    this.quantity,
    this.unit,
    this.barcode,
    this.brand,
    this.categoryId,
    this.categoryName,
    this.categoryIcon,
    this.categoryColorHex,
    this.price,
    this.notes,
    this.createdAt,
  });

  final String id;
  final String name;
  final DateTime? expiresAt;
  final String? locationId;
  final String? locationName;
  final String? locationIcon;
  final String? locationColorHex;
  final String? locationType;
  final num? quantity;
  final String? unit;
  final String? barcode;
  final String? brand;
  final String? categoryId;
  final String? categoryName;
  final String? categoryIcon;
  final String? categoryColorHex;
  final num? price;
  final String? notes;
  final DateTime? createdAt;

  factory Product.fromJson(Map<String, dynamic> json) {
    final loc = json['location'];
    final cat = json['category'];
    final isLoc = loc is Map<String, dynamic>;
    final isCat = cat is Map<String, dynamic>;
    return Product(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      expiresAt: json['expires_at'] != null
          ? DateTime.tryParse(json['expires_at'].toString())
          : null,
      locationId: json['location_id']?.toString(),
      locationName: isLoc ? loc['name'] as String? : null,
      locationIcon: isLoc ? loc['icon'] as String? : null,
      locationColorHex: isLoc ? loc['color'] as String? : null,
      locationType: isLoc ? loc['type'] as String? : null,
      quantity: json['quantity'] as num?,
      unit: json['unit'] as String?,
      barcode: json['barcode'] as String?,
      brand: json['brand'] as String?,
      categoryId: json['category_id']?.toString(),
      categoryName: isCat ? cat['name'] as String? : null,
      categoryIcon: isCat ? cat['icon'] as String? : null,
      categoryColorHex: isCat ? cat['color'] as String? : null,
      price: json['price'] as num?,
      notes: json['notes'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }
}

/// Données saisies pour créer (ou éditer) un produit, sérialisées pour l'API.
/// On n'envoie que les champs renseignés ; si `expiresAt` est nul mais qu'une
/// catégorie est fournie, le backend estime la date de péremption.
class ProductInput {
  const ProductInput({
    required this.name,
    required this.locationId,
    this.categoryId,
    this.quantity,
    this.unit,
    this.expiresAt,
    this.barcode,
    this.brand,
    this.notes,
  });

  final String name;
  final String locationId;
  final String? categoryId;
  final num? quantity;
  final String? unit;
  final DateTime? expiresAt;
  final String? barcode;
  final String? brand;
  final String? notes;

  Map<String, dynamic> toJson() => {
        'name': name,
        'location_id': locationId,
        if (categoryId != null) 'category_id': categoryId,
        if (quantity != null) 'quantity': quantity,
        if (unit != null && unit!.isNotEmpty) 'unit': unit,
        if (expiresAt != null) 'expires_at': _formatYmd(expiresAt!),
        if (barcode != null && barcode!.isNotEmpty) 'barcode': barcode,
        if (brand != null && brand!.isNotEmpty) 'brand': brand,
        if (notes != null && notes!.isNotEmpty) 'notes': notes,
      };

  /// Sérialisation pour l'édition (`PUT /products/:id`, INV-7).
  ///
  /// Contrairement à [toJson] (création), on envoie explicitement `null` pour
  /// les champs optionnels vidés afin de pouvoir les **effacer**. Les champs non
  /// gérés par le formulaire mobile (`price`, `image_url`) sont volontairement
  /// omis : Sequelize retire les clés `undefined` avant l'UPDATE, donc leur
  /// valeur existante est préservée côté serveur.
  Map<String, dynamic> toUpdateJson() => {
        'name': name,
        'location_id': locationId,
        'category_id': categoryId,
        'quantity': quantity,
        'unit': (unit != null && unit!.isNotEmpty) ? unit : null,
        'expires_at': expiresAt != null ? _formatYmd(expiresAt!) : null,
        'barcode': (barcode != null && barcode!.isNotEmpty) ? barcode : null,
        'brand': (brand != null && brand!.isNotEmpty) ? brand : null,
        'notes': (notes != null && notes!.isNotEmpty) ? notes : null,
      };
}

/// Formate une date en `YYYY-MM-DD` (format attendu par l'API pour `expires_at`).
String _formatYmd(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Valeurs de pré-remplissage du formulaire d'ajout, issues d'un scan
/// code-barre (Open Food Facts) ou d'une saisie manuelle. Tous les champs sont
/// optionnels : un code-barre inconnu ne renseigne que [barcode].
class ProductPrefill {
  const ProductPrefill({this.name, this.brand, this.barcode});

  final String? name;
  final String? brand;
  final String? barcode;
}
