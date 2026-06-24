import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Helpers de péremption partagés (accueil, inventaire, péremptions…).
/// Extraits de `home_screen.dart` pour éviter toute duplication.

/// Nombre de jours calendaires avant péremption. Négatif si déjà périmé,
/// 0 si la date est aujourd'hui.
int daysUntilExpiry(DateTime date) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final target = DateTime(date.year, date.month, date.day);
  return target.difference(today).inDays;
}

/// Libellé relatif d'urgence à partir du nombre de jours restants.
String expiryLabel(int days) {
  if (days < 0) return 'Périmé depuis ${-days} j';
  if (days == 0) return "Expire aujourd'hui";
  if (days == 1) return 'Demain';
  return 'Dans $days jours';
}

/// Couleur d'urgence selon les jours restants :
/// rouge (périmé/imminent), orange (≤3 j), jaune (≤7 j), vert (au-delà).
Color expiryColor(int days) {
  if (days <= 1) return AppColors.urgencyExpired;
  if (days <= 3) return AppColors.urgencySoon;
  if (days <= 7) return AppColors.urgencyWeek;
  return AppColors.urgencyOk;
}
