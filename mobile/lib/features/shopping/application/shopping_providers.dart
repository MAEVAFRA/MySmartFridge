import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/shopping_repository.dart';
import '../domain/shopping_models.dart';

/// Charge les listes de courses du foyer (avec leurs articles).
final shoppingListsProvider =
    FutureProvider.autoDispose<List<ShoppingList>>((ref) async {
  final repo = ref.read(shoppingRepositoryProvider);
  return repo.getLists();
});
