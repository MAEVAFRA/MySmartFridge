import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/shopping_repository.dart';
import '../domain/shopping_models.dart';

/// Charge les listes de courses du foyer (avec leurs articles).
final shoppingListsProvider =
    FutureProvider.autoDispose<List<ShoppingList>>((ref) async {
  final repo = ref.read(shoppingRepositoryProvider);
  return repo.getLists();
});

/// Liste de courses active sélectionnée par l'utilisateur (`null` → liste par
/// défaut / première liste).
class SelectedListId extends Notifier<String?> {
  @override
  String? build() => null;

  void select(String id) => state = id;

  /// Revient à la sélection par défaut (liste par défaut / première).
  void reset() => state = null;
}

final selectedListIdProvider =
    NotifierProvider<SelectedListId, String?>(SelectedListId.new);

/// Surcharges optimistes de l'état « coché » par article (id → coché), le temps
/// que l'appel réseau confirme. Permet un cochage instantané en magasin (SHOP-5).
class CheckOverrides extends Notifier<Map<String, bool>> {
  @override
  Map<String, bool> build() => const {};

  void set(String itemId, bool checked) => state = {...state, itemId: checked};

  void clear(String itemId) {
    if (!state.containsKey(itemId)) return;
    final next = {...state}..remove(itemId);
    state = next;
  }
}

final checkOverridesProvider =
    NotifierProvider<CheckOverrides, Map<String, bool>>(CheckOverrides.new);

/// Actions sur les articles (cocher / supprimer). Exposées via un provider pour
/// disposer d'un `Ref` stable au niveau conteneur : la ligne qui déclenche
/// l'action peut être démontée pendant l'appel réseau (l'article change de
/// section), il ne faut donc pas s'appuyer sur le `ref` du widget.
class ShoppingActions {
  ShoppingActions(this._ref);

  final Ref _ref;

  /// Coche/décoche un article avec mise à jour optimiste, puis confirmation
  /// serveur. Renvoie `false` en cas d'échec (l'appelant peut alerter).
  Future<bool> toggleChecked(
      String listId, ShoppingItem item, bool current) async {
    final next = !current;
    final overrides = _ref.read(checkOverridesProvider.notifier);
    overrides.set(item.id, next);
    try {
      await _ref
          .read(shoppingRepositoryProvider)
          .setItemChecked(listId, item.id, next);
      _ref.invalidate(shoppingListsProvider);
      await _ref.read(shoppingListsProvider.future);
      return true;
    } catch (_) {
      _ref.invalidate(shoppingListsProvider);
      return false;
    } finally {
      overrides.clear(item.id);
    }
  }

  /// Supprime un article ; renvoie `false` en cas d'échec.
  Future<bool> deleteItem(String listId, String itemId) async {
    try {
      await _ref.read(shoppingRepositoryProvider).deleteItem(listId, itemId);
      _ref.invalidate(shoppingListsProvider);
      return true;
    } catch (_) {
      _ref.invalidate(shoppingListsProvider);
      return false;
    }
  }
}

final shoppingActionsProvider =
    Provider<ShoppingActions>((ref) => ShoppingActions(ref));
