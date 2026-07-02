import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:image_picker/image_picker.dart';

/// Outils pour la photo de profil : rendu de l'`avatar_url` et sélection d'une
/// nouvelle image compressée (PROF-3).
///
/// La photo est stockée en base (colonne texte) sous forme de data-URL base64,
/// comme sur le web — pas d'upload de fichier séparé.

/// Côté le plus long de la photo après redimensionnement (aligné sur le web).
const double _kAvatarMaxSize = 400;

/// Qualité JPEG (0-100) après recompression.
const int _kAvatarQuality = 80;

/// Ouvre la [source] demandée (galerie ou caméra), redimensionne/compresse
/// l'image via `image_picker` et renvoie une data-URL JPEG prête à envoyer dans
/// `avatar_url`. Renvoie `null` si l'utilisateur annule la sélection.
Future<String?> pickAvatarDataUrl(ImageSource source) async {
  final file = await ImagePicker().pickImage(
    source: source,
    maxWidth: _kAvatarMaxSize,
    maxHeight: _kAvatarMaxSize,
    imageQuality: _kAvatarQuality,
  );
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  return 'data:image/jpeg;base64,${base64Encode(bytes)}';
}

/// Transforme un `avatar_url` en [ImageProvider] affichable, ou `null` si vide
/// ou illisible (fallback sur l'initiale du nom géré par l'appelant).
///
/// Gère les data-URL base64 (`data:image/…;base64,…`) stockées par l'app et le
/// web, ainsi qu'une éventuelle URL http(s) distante.
ImageProvider? avatarImageProvider(String? url) {
  if (url == null || url.isEmpty) return null;
  if (url.startsWith('data:')) {
    final commaIndex = url.indexOf(',');
    if (commaIndex == -1) return null;
    try {
      return MemoryImage(base64Decode(url.substring(commaIndex + 1)));
    } catch (_) {
      return null;
    }
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return NetworkImage(url);
  }
  return null;
}
