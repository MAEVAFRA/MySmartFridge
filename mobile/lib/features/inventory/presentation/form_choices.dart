import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import 'location_style.dart';

/// Petits widgets de choix partagés par les formulaires d'emplacement (INV-12)
/// et de catégorie (INV-14) : intitulé de section, choix d'emoji, choix de
/// couleur.

/// Intitulé de section d'un formulaire (petit label secondaire).
class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppColors.textSecondary),
    );
  }
}

/// Tuile de sélection d'un emoji (icône) dans une grille de présélections.
class IconChoice extends StatelessWidget {
  const IconChoice({
    super.key,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryLight : AppColors.background,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
              color: selected ? AppColors.primary : AppColors.border,
              width: selected ? 2 : 1),
        ),
        alignment: Alignment.center,
        child: Text(icon, style: const TextStyle(fontSize: 20)),
      ),
    );
  }
}

/// Pastille de sélection d'une couleur (hex) parmi des présélections.
class ColorChoice extends StatelessWidget {
  const ColorChoice({
    super.key,
    required this.hex,
    required this.selected,
    required this.onTap,
  });

  final String hex;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = parseHexColor(hex) ?? AppColors.primary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(
            color: selected ? AppColors.textPrimary : Colors.transparent,
            width: 2.5,
          ),
        ),
        child: selected
            ? const Icon(Icons.check, color: Colors.white, size: 18)
            : null,
      ),
    );
  }
}
