import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/data/auth_repository.dart';
import '../../auth/domain/auth_models.dart';

/// Profil complet de l'utilisateur, rechargé depuis `/auth/me`.
///
/// On refait l'appel plutôt que de se fier à l'état d'auth : la réponse de
/// connexion/inscription ne renvoie que l'identité de base (nom, email, foyers),
/// tandis que `/auth/me` renvoie aussi la photo, les régimes et les allergies —
/// nécessaires à l'écran profil (PROF-1).
final profileProvider = FutureProvider<User>((ref) {
  return ref.watch(authRepositoryProvider).me();
});
