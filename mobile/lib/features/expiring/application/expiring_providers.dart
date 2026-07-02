import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/expiry.dart';
import '../../inventory/data/inventory_repository.dart';
import '../../inventory/domain/inventory_models.dart';

/// État et logique de l'écran Péremptions (EXP-1/EXP-2).
///
/// S'appuie sur `GET /products/expiring?days=:n`, qui renvoie déjà les produits
/// **périmés + à venir** dans la fenêtre, triés par date de péremption
/// croissante (les plus urgents d'abord). On ne fait donc ici que sélectionner
/// la fenêtre et répartir la liste en deux paquets pour l'affichage.

/// Fenêtres de péremption proposées (en jours), calées sur le web (`/expiring`).
const List<int> expiryWindows = [3, 7, 14, 30];

/// Fenêtre par défaut (7 jours), identique au dashboard et au web.
const int _defaultWindow = 7;

/// Fenêtre sélectionnée, en jours. Pilote [expiringProductsProvider].
class ExpiringWindowNotifier extends Notifier<int> {
  @override
  int build() => _defaultWindow;

  void setDays(int days) => state = days;
}

final expiringWindowProvider =
    NotifierProvider<ExpiringWindowNotifier, int>(ExpiringWindowNotifier.new);

/// Produits périmés/à venir pour la fenêtre courante. Se recharge quand la
/// fenêtre change (l'ancienne liste reste affichée pendant le rechargement,
/// cf. `skipLoadingOnReload` côté écran).
final expiringProductsProvider =
    FutureProvider.autoDispose<List<Product>>((ref) async {
  final days = ref.watch(expiringWindowProvider);
  final repo = ref.read(inventoryRepositoryProvider);
  return repo.getExpiring(days: days);
});

/// Produits répartis en deux paquets pour l'affichage : déjà périmés vs à venir.
class ExpiringBuckets {
  const ExpiringBuckets({required this.expired, required this.upcoming});

  /// Périmés (date < aujourd'hui). Les plus anciens d'abord.
  final List<Product> expired;

  /// À venir dans la fenêtre (aujourd'hui inclus). Les plus proches d'abord.
  final List<Product> upcoming;
}

/// Répartit les produits en « déjà périmés » et « bientôt périmés ».
///
/// La date du jour compte comme « à venir » (cohérent avec le web et
/// [expiryLabel] : « Expire aujourd'hui »). L'ordre fourni par l'API est
/// préservé à l'intérieur de chaque paquet ; les produits sans date (qui ne
/// devraient pas remonter de cet endpoint) sont ignorés par sécurité.
ExpiringBuckets splitExpiring(List<Product> products) {
  final expired = <Product>[];
  final upcoming = <Product>[];
  for (final product in products) {
    final date = product.expiresAt;
    if (date == null) continue;
    if (daysUntilExpiry(date) < 0) {
      expired.add(product);
    } else {
      upcoming.add(product);
    }
  }
  return ExpiringBuckets(expired: expired, upcoming: upcoming);
}
