import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../domain/inventory_models.dart';

/// Style visuel d'un emplacement (couleur). Extrait de `home_screen.dart`
/// pour être partagé entre l'accueil et l'inventaire.

/// Couleur d'un emplacement : sa couleur personnalisée si définie, sinon une
/// couleur par défaut selon son type (frigo / congélo / placard).
Color locationColor(Location location) {
  final parsed = parseHexColor(location.colorHex);
  if (parsed != null) return parsed;
  switch (location.type) {
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
