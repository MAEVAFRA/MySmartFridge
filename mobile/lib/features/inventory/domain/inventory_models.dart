/// Emplacement de stockage (réfrigérateur, congélateur, placard…).
class Location {
  const Location({
    required this.id,
    required this.name,
    required this.type,
    this.icon,
    this.colorHex,
    this.temperatureCelsius,
    this.displayOrder,
    this.isDefault = false,
  });

  final String id;
  final String name;
  final String type; // fridge / freezer / pantry / ...
  final String? icon; // emoji renvoyé par l'API
  final String? colorHex; // ex. "#3b82f6"

  /// Température de l'emplacement en °C (optionnelle).
  final num? temperatureCelsius;
  final int? displayOrder;

  /// Emplacement de destination par défaut (utilisé pour présélectionner la
  /// cible lors d'un transfert de courses vers le stock, SHOP-7).
  final bool isDefault;

  factory Location.fromJson(Map<String, dynamic> json) {
    return Location(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? '',
      icon: json['icon'] as String?,
      colorHex: json['color'] as String?,
      temperatureCelsius: json['temperature_celsius'] as num?,
      displayOrder: _asInt(json['display_order']),
      isDefault: json['is_default'] == true,
    );
  }
}

/// Données pour créer / modifier un emplacement (INV-12).
class LocationInput {
  const LocationInput({
    required this.name,
    required this.type,
    required this.icon,
    required this.colorHex,
    this.temperatureCelsius,
  });

  final String name;
  final String type;
  final String icon;
  final String colorHex;
  final num? temperatureCelsius;

  Map<String, dynamic> toJson() => {
        'name': name,
        'type': type,
        'icon': icon,
        'color': colorHex,
        'temperature_celsius': temperatureCelsius,
      };
}

/// Détail d'un emplacement avec ses produits (INV-13, `GET /locations/:id`).
class LocationDetail {
  const LocationDetail({required this.location, required this.products});

  final Location location;
  final List<Product> products;

  factory LocationDetail.fromJson(Map<String, dynamic> json) {
    final rawProducts = json['products'];
    return LocationDetail(
      location: Location.fromJson(json),
      products: rawProducts is List
          ? rawProducts
              .map((e) => Product.fromJson(e as Map<String, dynamic>))
              .toList()
          : const [],
    );
  }
}

/// Catégorie de produit (légumes, produits laitiers…).
///
/// Les durées de conservation ([avgShelfDays] / [avgShelfDaysFreezer]) servent à
/// estimer automatiquement la date de péremption d'un produit (INV-9) ; elles
/// sont éditables via la gestion des catégories (INV-14).
class Category {
  const Category({
    required this.id,
    required this.name,
    this.icon,
    this.colorHex,
    this.avgShelfDays,
    this.avgShelfDaysOpened,
    this.avgShelfDaysFreezer,
    this.storageInstructions,
    this.isSystem = true,
  });

  final String id;
  final String name;
  final String? icon;
  final String? colorHex;

  /// Durée de conservation moyenne (jours), à température ambiante / au frigo.
  final int? avgShelfDays;

  /// Durée de conservation une fois entamé (jours).
  final int? avgShelfDaysOpened;

  /// Durée de conservation au congélateur (jours).
  final int? avgShelfDaysFreezer;
  final String? storageInstructions;

  /// Catégorie par défaut fournie par l'app (vs. créée par l'utilisateur).
  final bool isSystem;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      icon: json['icon'] as String?,
      colorHex: json['color'] as String?,
      avgShelfDays: _asInt(json['avg_shelf_days']),
      avgShelfDaysOpened: _asInt(json['avg_shelf_days_opened']),
      avgShelfDaysFreezer: _asInt(json['avg_shelf_days_freezer']),
      storageInstructions: json['storage_instructions'] as String?,
      isSystem: json['is_system'] as bool? ?? true,
    );
  }
}

/// Convertit une valeur JSON (int, num ou chaîne) en `int?`, tolérant aux nulls.
int? _asInt(Object? v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString());
}

/// Durée de conservation estimée (jours) d'un produit d'une catégorie donnée,
/// selon le type d'emplacement. Reflète la logique du backend : au congélateur,
/// on privilégie [Category.avgShelfDaysFreezer] si elle est renseignée.
/// Renvoie `null` si la catégorie n'a aucune durée exploitable.
int? estimateShelfDays(Category category, String? locationType) {
  if (locationType == 'freezer' && category.avgShelfDaysFreezer != null) {
    return category.avgShelfDaysFreezer;
  }
  return category.avgShelfDays;
}

/// Date de péremption estimée pour un produit ([from] + durée de conservation),
/// ou `null` si la catégorie n'a pas de durée. [from] défaut = aujourd'hui.
/// Le calcul se fait en jours calendaires (minuit), comme côté serveur.
DateTime? estimateExpiryDate(
  Category category,
  String? locationType, {
  DateTime? from,
}) {
  final days = estimateShelfDays(category, locationType);
  if (days == null) return null;
  final base = from ?? DateTime.now();
  return DateTime(base.year, base.month, base.day + days);
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
    this.quantityMin,
    this.unit,
    this.barcode,
    this.brand,
    this.categoryId,
    this.categoryName,
    this.categoryIcon,
    this.categoryColorHex,
    this.price,
    this.notes,
    this.imageUrl,
    this.thumbnailUrl,
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

  /// Seuil de stock bas (`quantity_min`). `0` (ou nul) signifie « pas de seuil ».
  final num? quantityMin;
  final String? unit;
  final String? barcode;
  final String? brand;
  final String? categoryId;
  final String? categoryName;
  final String? categoryIcon;
  final String? categoryColorHex;
  final num? price;
  final String? notes;

  /// Photo du produit : data-URL (`data:image/…;base64,…`) enregistrée depuis
  /// l'app, ou URL distante (ex. Open Food Facts). `null` si aucune photo.
  final String? imageUrl;
  final String? thumbnailUrl;
  final DateTime? createdAt;

  /// Vrai si un seuil de stock bas est défini et que la quantité l'atteint —
  /// sert au filtre « stock bas » de l'ajout de courses depuis l'inventaire.
  bool get isLowStock {
    final min = quantityMin;
    final qty = quantity;
    return min != null && min > 0 && qty != null && qty <= min;
  }

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
      quantityMin: json['quantity_min'] as num?,
      unit: json['unit'] as String?,
      barcode: json['barcode'] as String?,
      brand: json['brand'] as String?,
      categoryId: json['category_id']?.toString(),
      categoryName: isCat ? cat['name'] as String? : null,
      categoryIcon: isCat ? cat['icon'] as String? : null,
      categoryColorHex: isCat ? cat['color'] as String? : null,
      price: json['price'] as num?,
      notes: json['notes'] as String?,
      imageUrl: json['image_url'] as String?,
      thumbnailUrl: json['thumbnail_url'] as String?,
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
    this.imageUrl,
    this.includeImage = false,
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

  /// Photo à enregistrer : data-URL compressée, URL distante, ou `null` pour
  /// « pas de photo / retirer la photo ».
  final String? imageUrl;

  /// Vrai si la photo a été modifiée dans le formulaire — seul cas où l'on
  /// sérialise `image_url` en édition (sinon on préserve la photo existante,
  /// cf. [toUpdateJson]). En création, la photo est incluse dès qu'elle existe.
  final bool includeImage;

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
        if (imageUrl != null && imageUrl!.isNotEmpty) 'image_url': imageUrl,
      };

  /// Sérialisation pour l'édition (`PUT /products/:id`, INV-7).
  ///
  /// Contrairement à [toJson] (création), on envoie explicitement `null` pour
  /// les champs optionnels vidés afin de pouvoir les **effacer**. `price` (non
  /// géré par le formulaire mobile) est volontairement omis : Sequelize retire
  /// les clés `undefined` avant l'UPDATE, donc sa valeur existante est préservée.
  /// `image_url` n'est envoyé que si la photo a été modifiée ([includeImage]),
  /// afin de préserver une photo existante non touchée (INV-10).
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
        if (includeImage) 'image_url': imageUrl,
      };
}

/// Formate une date en `YYYY-MM-DD` (format attendu par l'API pour `expires_at`).
String _formatYmd(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Motif de retrait d'un produit du stock (INV-8). Envoyé au backend qui le
/// journalise pour les statistiques de consommation / gaspillage. Le retrait
/// « sans motif » (juste sortir du stock) est représenté par l'absence de valeur.
enum ProductRemovalReason {
  /// Produit consommé (compté comme « bien utilisé »).
  consumed('consumed'),

  /// Produit jeté / périmé (compté comme gaspillage).
  thrown('thrown');

  const ProductRemovalReason(this.apiValue);

  /// Valeur attendue par l'API dans le corps du `DELETE`.
  final String apiValue;
}

/// Valeurs de pré-remplissage du formulaire d'ajout, issues d'un scan
/// code-barre (Open Food Facts) ou d'une saisie manuelle. Tous les champs sont
/// optionnels : un code-barre inconnu ne renseigne que [barcode].
class ProductPrefill {
  const ProductPrefill({this.name, this.brand, this.barcode, this.imageUrl});

  final String? name;
  final String? brand;
  final String? barcode;

  /// Photo distante éventuelle (URL Open Food Facts) à pré-remplir (INV-10/11).
  final String? imageUrl;
}
