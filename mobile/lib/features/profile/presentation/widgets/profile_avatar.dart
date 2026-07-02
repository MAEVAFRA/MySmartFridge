import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/avatar_service.dart';

/// Pastille d'avatar : affiche la photo si disponible, sinon l'initiale du nom
/// sur fond coloré. Partagée par l'affichage et l'édition du profil.
class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar({
    super.key,
    required this.avatarUrl,
    required this.name,
    this.radius = 40,
  });

  final String? avatarUrl;
  final String name;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final image = avatarImageProvider(avatarUrl);
    final trimmed = name.trim();
    final initial = trimmed.isNotEmpty ? trimmed[0].toUpperCase() : '?';

    return CircleAvatar(
      radius: radius,
      backgroundColor: AppColors.primary,
      // `foregroundImage` laisse l'initiale visible si l'image échoue à charger.
      foregroundImage: image,
      child: image == null
          ? Text(
              initial,
              style: TextStyle(
                fontSize: radius * 0.8,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            )
          : null,
    );
  }
}
