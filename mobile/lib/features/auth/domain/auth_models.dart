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
    this.households = const [],
  });

  final String id;
  final String name;
  final String email;
  final String? avatarUrl;
  final List<Household> households;

  factory User.fromJson(Map<String, dynamic> json) {
    final rawHouseholds = json['households'] as List<dynamic>?;
    return User(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      avatarUrl: json['avatar_url'] as String?,
      households: rawHouseholds
              ?.map((e) => Household.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}
