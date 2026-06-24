import 'dart:convert';

/// Charge utile (payload) d'un JWT, décodée **localement** et **sans vérifier
/// la signature**.
///
/// Sert uniquement à deux choses côté client : reconstruire une identité
/// minimale pour rester connecté en mode dégradé quand `/auth/me` est
/// injoignable, et détecter un token déjà expiré pour déconnecter proprement.
/// Ne jamais s'en servir pour autoriser une action sensible : seule l'API,
/// qui valide la signature, fait foi.
class JwtPayload {
  const JwtPayload({this.id, this.email, this.expiresAt});

  final String? id;
  final String? email;
  final DateTime? expiresAt;

  /// `true` si le token porte une date d'expiration déjà passée. Un token sans
  /// `exp` est considéré non expiré (impossible de trancher localement).
  bool get isExpired {
    final exp = expiresAt;
    return exp != null && DateTime.now().isAfter(exp);
  }

  /// Décode la charge utile d'un JWT. Renvoie `null` si le token est malformé.
  static JwtPayload? tryDecode(String token) {
    final parts = token.split('.');
    if (parts.length != 3) return null;
    try {
      final json =
          utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
      final map = jsonDecode(json);
      if (map is! Map<String, dynamic>) return null;
      final exp = map['exp'];
      return JwtPayload(
        id: map['id']?.toString(),
        email: map['email'] as String?,
        expiresAt:
            exp is int ? DateTime.fromMillisecondsSinceEpoch(exp * 1000) : null,
      );
    } catch (_) {
      return null;
    }
  }
}
