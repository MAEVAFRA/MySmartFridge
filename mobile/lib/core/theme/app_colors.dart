import 'package:flutter/material.dart';

/// Jetons de couleur de l'application.
///
/// Alignés sur le design system du front web (config Tailwind) pour garder une
/// identité visuelle cohérente entre le web (gérance) et le mobile (compagnon).
class AppColors {
  const AppColors._();

  // --- Primaire (bleu) ---
  static const Color primary = Color(0xFF3B82F6); // primary-500
  static const Color primaryDark = Color(0xFF2563EB); // primary-600 (actif/action)
  static const Color primaryLight = Color(0xFFEFF6FF); // primary-50

  // --- Couleurs sémantiques par emplacement ---
  static const Color fridge = Color(0xFF3B82F6); // Réfrigérateur
  static const Color freezer = Color(0xFF06B6D4); // Congélateur
  static const Color pantry = Color(0xFFF59E0B); // Placard

  // --- Code couleur d'urgence de péremption ---
  static const Color urgencyExpired = Color(0xFFEF4444); // périmé / critique
  static const Color urgencySoon = Color(0xFFF59E0B); // proche
  static const Color urgencyWeek = Color(0xFFFACC15); // bientôt
  static const Color urgencyOk = Color(0xFF16A34A); // ok

  // --- Neutres ---
  static const Color background = Color(0xFFF8FAFC); // fond d'écran
  static const Color surface = Color(0xFFFFFFFF); // cartes / surfaces
  static const Color border = Color(0xFFE2E8F0);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color neutral400 = Color(0xFF94A3B8); // icônes / onglets inactifs

  // --- États ---
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
}
