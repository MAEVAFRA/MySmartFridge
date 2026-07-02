import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../home/dashboard_provider.dart';
import '../../inventory/application/inventory_providers.dart';
import '../data/shopping_repository.dart';
import '../data/shopping_sync_storage.dart';
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

/// File des cochages faits localement mais pas encore confirmés par le serveur
/// (SHOP-8), indexée par `id` d'article. Sert à la fois de **surcharge optimiste**
/// (l'article s'affiche coché instantanément) et de **file hors ligne** persistée :
/// tant qu'un cochage y figure, il est rejoué au retour du réseau.
///
/// Volontairement **non `autoDispose`** : la file doit survivre à la navigation
/// entre onglets et au démontage de l'écran Courses.
class PendingChecks extends Notifier<Map<String, PendingCheck>> {
  @override
  Map<String, PendingCheck> build() {
    _restore();
    return const {};
  }

  /// Recharge la file persistée au démarrage. Les cochages éventuellement faits
  /// pendant ce chargement asynchrone priment (on ne les écrase pas).
  Future<void> _restore() async {
    final saved =
        await ref.read(shoppingSyncStorageProvider).readPendingChecks();
    if (saved.isNotEmpty) state = {...saved, ...state};
  }

  /// Enregistre l'état voulu pour [itemId] (surcharge optimiste + persistance).
  Future<void> set(String itemId, String listId, bool checked) async {
    state = {
      ...state,
      itemId: PendingCheck(listId: listId, checked: checked),
    };
    await _persist();
  }

  /// Retire [itemId] de la file (cochage confirmé côté serveur ou abandonné).
  Future<void> remove(String itemId) async {
    if (!state.containsKey(itemId)) return;
    state = {...state}..remove(itemId);
    await _persist();
  }

  Future<void> _persist() =>
      ref.read(shoppingSyncStorageProvider).writePendingChecks(state);
}

final pendingChecksProvider =
    NotifierProvider<PendingChecks, Map<String, PendingCheck>>(
        PendingChecks.new);

/// Issue d'un cochage : confirmé par le serveur, mis en file hors ligne, ou
/// échec réel (erreur serveur) — l'écran adapte son retour utilisateur.
enum ToggleResult { synced, queuedOffline, failed }

/// Actions sur les articles (cocher / supprimer / synchroniser / transférer).
/// Exposées via un provider pour disposer d'un `Ref` stable au niveau conteneur :
/// la ligne qui déclenche l'action peut être démontée pendant l'appel réseau
/// (l'article change de section), il ne faut donc pas s'appuyer sur le `ref` du
/// widget.
class ShoppingActions {
  ShoppingActions(this._ref);

  final Ref _ref;

  /// Empêche deux rejeux de file concurrents (timer + reprise d'app + toggle).
  bool _flushing = false;

  /// Coche/décoche un article avec mise à jour optimiste persistée.
  ///
  /// - succès réseau → surcharge retirée, article confirmé ([ToggleResult.synced]) ;
  /// - hors ligne → surcharge conservée et mise en file ([ToggleResult.queuedOffline]) ;
  /// - erreur serveur → surcharge annulée ([ToggleResult.failed]).
  Future<ToggleResult> toggleChecked(
      String listId, ShoppingItem item, bool current) async {
    final next = !current;
    final pending = _ref.read(pendingChecksProvider.notifier);
    await pending.set(item.id, listId, next);
    try {
      await _ref
          .read(shoppingRepositoryProvider)
          .setItemChecked(listId, item.id, next);
      // On attend la liste rechargée (qui porte déjà la nouvelle valeur) avant
      // de retirer la surcharge, pour éviter tout clignotement.
      _ref.invalidate(shoppingListsProvider);
      await _ref.read(shoppingListsProvider.future);
      await pending.remove(item.id);
      // Réseau manifestement rétabli : on écoule le reste de la file en fond.
      unawaited(flushPending());
      return ToggleResult.synced;
    } on DioException catch (e) {
      if (isNetworkError(e)) {
        // Hors ligne : on garde l'état optimiste + la file pour un rejeu ultérieur.
        return ToggleResult.queuedOffline;
      }
      await pending.remove(item.id);
      _ref.invalidate(shoppingListsProvider);
      return ToggleResult.failed;
    } catch (_) {
      await pending.remove(item.id);
      _ref.invalidate(shoppingListsProvider);
      return ToggleResult.failed;
    }
  }

  /// Rejoue la file des cochages hors ligne. S'arrête au premier échec réseau
  /// (toujours hors ligne) ; abandonne les articles disparus côté serveur.
  /// Sans effet si la file est vide ou si un rejeu est déjà en cours.
  Future<void> flushPending() async {
    if (_flushing) return;
    final snapshot = {..._ref.read(pendingChecksProvider)};
    if (snapshot.isEmpty) return;

    _flushing = true;
    final pending = _ref.read(pendingChecksProvider.notifier);
    final repo = _ref.read(shoppingRepositoryProvider);
    var changed = false;
    try {
      for (final entry in snapshot.entries) {
        try {
          await repo.setItemChecked(
              entry.value.listId, entry.key, entry.value.checked);
          await pending.remove(entry.key);
          changed = true;
        } on DioException catch (e) {
          if (isNetworkError(e)) break; // toujours hors ligne
          // 4xx/5xx (ex. article supprimé) : impossible à synchroniser, on l'oublie.
          await pending.remove(entry.key);
          changed = true;
        }
      }
    } finally {
      _flushing = false;
    }
    if (changed) _ref.invalidate(shoppingListsProvider);
  }

  /// Ajoute des articles à la liste depuis le stock (SHOP-6). Peut lever :
  /// l'appelant gère le retour utilisateur.
  Future<InventoryAddResult> addFromInventory(
      String listId, Map<String, num> quantities) async {
    final result = await _ref
        .read(shoppingRepositoryProvider)
        .addItemsFromInventory(listId, quantities);
    _ref.invalidate(shoppingListsProvider);
    return result;
  }

  /// Transfère les articles cochés vers le stock (SHOP-7). Synchronise d'abord
  /// les cochages hors ligne (le backend ne transfère que les articles cochés
  /// *côté serveur*), puis rafraîchit stock + tableau de bord.
  Future<TransferResult> transferCheckedToStock(String listId,
      {String? locationId}) async {
    await flushPending();
    final result = await _ref
        .read(shoppingRepositoryProvider)
        .transferToStock(listId, locationId: locationId);
    _ref.invalidate(shoppingListsProvider);
    _ref.invalidate(inventoryProvider);
    _ref.invalidate(locationsProvider);
    _ref.invalidate(dashboardProvider);
    return result;
  }

  /// Supprime un article ; renvoie `false` en cas d'échec.
  Future<bool> deleteItem(String listId, String itemId) async {
    try {
      await _ref.read(shoppingRepositoryProvider).deleteItem(listId, itemId);
      // Un article supprimé ne doit plus traîner dans la file de synchronisation.
      await _ref.read(pendingChecksProvider.notifier).remove(itemId);
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
