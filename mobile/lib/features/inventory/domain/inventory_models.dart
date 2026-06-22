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

/// Produit en stock. Le champ `location` est imbriqué côté API.
class Product {
  const Product({
    required this.id,
    required this.name,
    this.expiresAt,
    this.locationId,
    this.locationName,
    this.quantity,
    this.unit,
  });

  final String id;
  final String name;
  final DateTime? expiresAt;
  final String? locationId;
  final String? locationName;
  final num? quantity;
  final String? unit;

  factory Product.fromJson(Map<String, dynamic> json) {
    final loc = json['location'];
    return Product(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      expiresAt: json['expires_at'] != null
          ? DateTime.tryParse(json['expires_at'].toString())
          : null,
      locationId: json['location_id']?.toString(),
      locationName: loc is Map<String, dynamic> ? loc['name'] as String? : null,
      quantity: json['quantity'] as num?,
      unit: json['unit'] as String?,
    );
  }
}
