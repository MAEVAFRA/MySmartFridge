import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../domain/inventory_models.dart';

/// Style visuel d'un emplacement (couleur). Extrait de `home_screen.dart`
/// pour être partagé entre l'accueil et l'inventaire.

/// Couleur d'un emplacement : sa couleur personnalisée si définie, sinon une
/// couleur par défaut selon son type (frigo / congélo / placard).
Color locationColor(Location location) =>
    locationColorFrom(location.colorHex, location.type);

/// Variante à partir d'un hex et d'un type bruts (utile quand on n'a pas un
/// objet [Location] sous la main, ex. les champs imbriqués d'un produit).
Color locationColorFrom(String? colorHex, String? type) {
  final parsed = parseHexColor(colorHex);
  if (parsed != null) return parsed;
  switch (type) {
    case 'fridge':
      return AppColors.fridge;
    case 'freezer':
      return AppColors.freezer;
    case 'pantry':
      return AppColors.pantry;
    default:
      return AppColors.primary;
  }
}

/// Parse une couleur hexadécimale (`#RRGGBB` ou `#AARRGGBB`).
/// Renvoie `null` si la chaîne est vide ou invalide.
Color? parseHexColor(String? hex) {
  if (hex == null || hex.isEmpty) return null;
  var h = hex.replaceAll('#', '').trim();
  if (h.length == 6) h = 'FF$h';
  if (h.length != 8) return null;
  final value = int.tryParse(h, radix: 16);
  return value == null ? null : Color(value);
}
