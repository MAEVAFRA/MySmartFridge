import 'jwt.dart';

/// Foyer auquel l'utilisateur appartient (renvoyé par l'API d'authentification).
class Household {
  const Household({required this.id, required this.name, required this.role});

  final String id;
  final String name;
  final String role;

  factory Household.fromJson(Map<String, dynamic> json) {
    return Household(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      role: json['role'] as String? ?? 'member',
    );
  }
}

/// Utilisateur connecté.
class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    this.avatarUrl,
    this.dietaryPreferences,
    this.allergies,
    this.households = const [],
  });

  final String id;
  final String name;
  final String email;
  final String? avatarUrl;

  /// Régimes / préférences alimentaires, texte libre séparé par des virgules
  /// (ex. « végétarien, sans gluten »). Alimente les suggestions anti-gaspi.
  final String? dietaryPreferences;

  /// Allergies, texte libre séparé par des virgules (ex. « arachides, lactose »).
  final String? allergies;

  final List<Household> households;

  factory User.fromJson(Map<String, dynamic> json) {
    final rawHouseholds = json['households'] as List<dynamic>?;
    return User(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      avatarUrl: json['avatar_url'] as String?,
      dietaryPreferences: json['dietary_preferences'] as String?,
      allergies: json['allergies'] as String?,
      households: rawHouseholds
              ?.map((e) => Household.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }

  /// Copie en remplaçant certains champs. Pour les champs nullables, un
  /// indicateur dédié permet de forcer la remise à `null` (retrait d'avatar…),
  /// qu'un simple paramètre nullable ne saurait distinguer d'« inchangé ».
  User copyWith({
    String? name,
    String? email,
    String? avatarUrl,
    bool clearAvatar = false,
    String? dietaryPreferences,
    String? allergies,
    List<Household>? households,
  }) {
    return User(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      avatarUrl: clearAvatar ? null : (avatarUrl ?? this.avatarUrl),
      dietaryPreferences: dietaryPreferences ?? this.dietaryPreferences,
      allergies: allergies ?? this.allergies,
      households: households ?? this.households,
    );
  }

  /// Identité minimale reconstruite depuis le JWT stocké, pour rester connecté
  /// en mode dégradé hors-ligne. Le nom est dérivé de l'email faute de mieux ;
  /// le profil complet (nom réel, foyers) est rechargé via `/auth/me` au retour
  /// du réseau.
  factory User.fromJwt(JwtPayload payload) {
    final email = payload.email ?? '';
    return User(
      id: payload.id ?? '',
      name: _displayNameFromEmail(email),
      email: email,
    );
  }
}

/// Transforme la partie locale d'un email en nom affichable.
/// `omar.amri@x.com` → `Omar Amri`, `alice@demo.com` → `Alice`.
String _displayNameFromEmail(String email) {
  final local = email.split('@').first;
  return local
      .split(RegExp(r'[._-]+'))
      .where((part) => part.isNotEmpty)
      .map((part) => part[0].toUpperCase() + part.substring(1))
      .join(' ');
}
