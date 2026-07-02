import 'package:flutter_test/flutter_test.dart';
import 'package:mysmartfridge/features/inventory/application/inventory_providers.dart';
import 'package:mysmartfridge/features/inventory/domain/inventory_models.dart';

/// Tests de la logique de recherche / filtres / tri de l'inventaire (INV-3).
/// On vise `buildInventoryView`, pure et découplée de l'UI.
void main() {
  // Dates relatives à aujourd'hui pour des assertions stables.
  final now = DateTime.now();
  DateTime inDays(int d) => DateTime(now.year, now.month, now.day + d);

  final fridge = const Location(id: 'l1', name: 'Frigo', type: 'fridge');
  final pantry = const Location(id: 'l2', name: 'Placard', type: 'pantry');

  final lait = Product(
    id: 'p1',
    name: 'Lait',
    brand: 'Lactel',
    locationId: 'l1',
    expiresAt: inDays(2),
  );
  final yaourt = Product(
    id: 'p2',
    name: 'Yaourt',
    locationId: 'l1',
    expiresAt: inDays(-1), // périmé
  );
  final pates = Product(
    id: 'p3',
    name: 'Pâtes',
    locationId: 'l2',
    expiresAt: inDays(30),
  );
  final sel = const Product(
    id: 'p4',
    name: 'Sel',
    locationId: 'l2',
  ); // sans date

  final data = InventoryData(
    products: [lait, yaourt, pates, sel],
    locations: [fridge, pantry],
  );

  List<Product> flatten(InventoryView view) =>
      view.groups.expand((g) => g.products).toList();

  test('sans filtre : tous les produits, comptage correct', () {
    final view = buildInventoryView(data, const InventoryFilters());
    expect(view.matchCount, 4);
    expect(flatten(view).map((p) => p.id), containsAll(['p1', 'p2', 'p3', 'p4']));
  });

  test('recherche par nom (insensible à la casse)', () {
    final view = buildInventoryView(
        data, const InventoryFilters(search: 'pÂT'));
    expect(view.matchCount, 1);
    expect(flatten(view).single.id, 'p3');
  });

  test('recherche par marque', () {
    final view = buildInventoryView(
        data, const InventoryFilters(search: 'lactel'));
    expect(flatten(view).single.id, 'p1');
  });

  test('filtre par emplacement', () {
    final view = buildInventoryView(
        data, const InventoryFilters(locationId: 'l2'));
    expect(view.matchCount, 2);
    expect(flatten(view).map((p) => p.id), containsAll(['p3', 'p4']));
  });

  test('filtre péremption « périmés »', () {
    final view = buildInventoryView(
        data, const InventoryFilters(expiry: ExpiryFilter.expired));
    expect(flatten(view).single.id, 'p2');
  });

  test('filtre péremption « bientôt » (≤7j, non périmé)', () {
    final view = buildInventoryView(
        data, const InventoryFilters(expiry: ExpiryFilter.soon));
    expect(flatten(view).single.id, 'p1'); // p2 périmé exclu, p3 trop loin
  });

  test('tri par péremption : urgents d\'abord, sans date en dernier', () {
    final view = buildInventoryView(
        data, const InventoryFilters(sort: InventorySort.expiry));
    // Le tri s'applique à l'intérieur de chaque groupe d'emplacement.
    final placard = view.groups.firstWhere((g) => g.location?.id == 'l2');
    expect(placard.products.map((p) => p.id), ['p3', 'p4']); // date avant null
  });

  test('tri par nom (alphabétique)', () {
    final view = buildInventoryView(
        data, const InventoryFilters(sort: InventorySort.name));
    final frigo = view.groups.firstWhere((g) => g.location?.id == 'l1');
    expect(frigo.products.map((p) => p.id), ['p1', 'p2']); // Lait avant Yaourt
  });

  test('combinaison recherche + emplacement sans résultat', () {
    final view = buildInventoryView(
        data, const InventoryFilters(search: 'lait', locationId: 'l2'));
    expect(view.matchCount, 0);
    expect(view.groups, isEmpty);
  });

  group('pagination / lazy-load (INV-16)', () {
    test('la limite plafonne le nombre de produits affichés', () {
      final view =
          buildInventoryView(data, const InventoryFilters(), limit: 2);
      expect(view.matchCount, 4); // total inchangé
      expect(view.visibleCount, 2);
      expect(view.hasMore, isTrue);
      expect(flatten(view).length, 2);
    });

    test('limite ≥ total : tout est affiché, hasMore faux', () {
      final view =
          buildInventoryView(data, const InventoryFilters(), limit: 10);
      expect(view.visibleCount, 4);
      expect(view.hasMore, isFalse);
      expect(flatten(view).length, 4);
    });

    test('sans limite : tout est affiché', () {
      final view = buildInventoryView(data, const InventoryFilters());
      expect(view.hasMore, isFalse);
      expect(flatten(view).length, 4);
    });

    test('la limite retient les plus urgents d\'abord', () {
      final view = buildInventoryView(
        data,
        const InventoryFilters(sort: InventorySort.expiry),
        limit: 2,
      );
      // yaourt (périmé) et lait (J+2) sont les deux plus urgents.
      expect(flatten(view).map((p) => p.id), containsAll(['p1', 'p2']));
    });
  });
}
