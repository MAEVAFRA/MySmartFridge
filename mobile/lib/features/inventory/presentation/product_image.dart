import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';

/// Construit un [ImageProvider] depuis une photo produit (INV-10) : soit une
/// data-URL base64 enregistrée par l'app (`data:image/…;base64,…`), soit une URL
/// distante (ex. Open Food Facts). Renvoie `null` si vide ou illisible.
ImageProvider? productImageProvider(String? url) {
  if (url == null || url.isEmpty) return null;
  if (url.startsWith('data:')) {
    final comma = url.indexOf(',');
    if (comma < 0) return null;
    try {
      return MemoryImage(base64Decode(url.substring(comma + 1)));
    } catch (_) {
      return null;
    }
  }
  if (url.startsWith('http')) return NetworkImage(url);
  return null;
}

/// Vignette carrée d'un produit : sa photo si disponible, sinon l'emoji de sa
/// catégorie, sinon une icône générique.
class ProductThumb extends StatelessWidget {
  const ProductThumb({
    super.key,
    this.imageUrl,
    this.emoji,
    this.size = 44,
    this.radius = 10,
  });

  final String? imageUrl;
  final String? emoji;
  final double size;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final provider = productImageProvider(imageUrl);
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: SizedBox(
        width: size,
        height: size,
        child: provider != null
            ? Image(
                image: provider,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => _fallback(),
              )
            : _fallback(),
      ),
    );
  }

  Widget _fallback() {
    return Container(
      color: AppColors.primaryLight,
      alignment: Alignment.center,
      child: emoji != null
          ? Text(emoji!, style: TextStyle(fontSize: size * 0.5))
          : Icon(Icons.inventory_2_outlined,
              color: AppColors.primary, size: size * 0.5),
    );
  }
}

/// Ouvre la caméra ou la galerie, compresse l'image (redimensionnement +
/// qualité, faits par image_picker) et renvoie une data-URL JPEG prête à
/// envoyer, ou `null` si l'utilisateur annule.
///
/// La compression est indispensable : une photo brute de téléphone pèse
/// plusieurs Mo, or on stocke l'image en base (colonne TEXT) et on la transmet
/// dans le corps JSON. On plafonne donc la taille et la qualité.
Future<String?> pickProductImageDataUrl(ImageSource source) async {
  final picker = ImagePicker();
  final file = await picker.pickImage(
    source: source,
    maxWidth: 1000,
    maxHeight: 1000,
    imageQuality: 70,
  );
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  return 'data:image/jpeg;base64,${base64Encode(bytes)}';
}
