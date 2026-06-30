/// Résultat d'un lookup code-barre via le proxy Open Food Facts du backend
/// (`GET /products/barcode/:barcode`).
///
/// Open Food Facts peut connaître un code-barre sans pour autant disposer d'un
/// nom exploitable : [hasName] permet de distinguer un produit réellement
/// identifié d'une fiche vide (on ne pré-remplira alors que le code-barre).
class BarcodeLookup {
  const BarcodeLookup({
    required this.barcode,
    required this.name,
    this.brand,
    this.imageUrl,
    this.quantityText,
  });

  final String barcode;
  final String name;
  final String? brand;
  final String? imageUrl;

  /// Quantité telle qu'affichée par Open Food Facts (ex. « 500 g »). Texte
  /// libre non normalisé : on l'affiche à titre indicatif, sans le mapper sur
  /// le couple quantité/unité du formulaire.
  final String? quantityText;

  /// Vrai si Open Food Facts a renvoyé un nom exploitable.
  bool get hasName => name.trim().isNotEmpty;

  factory BarcodeLookup.fromJson(Map<String, dynamic> json) {
    String? trimmedOrNull(Object? v) {
      final s = (v as String?)?.trim();
      return (s == null || s.isEmpty) ? null : s;
    }

    return BarcodeLookup(
      barcode: json['barcode']?.toString() ?? '',
      name: (json['name'] as String?)?.trim() ?? '',
      brand: trimmedOrNull(json['brand']),
      imageUrl: trimmedOrNull(json['image_url']),
      quantityText: trimmedOrNull(json['quantity_text']),
    );
  }
}
