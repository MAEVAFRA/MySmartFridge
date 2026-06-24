import 'package:flutter_test/flutter_test.dart';
import 'package:mysmartfridge/core/utils/expiry.dart';
import 'package:mysmartfridge/features/inventory/application/inventory_providers.dart';
import 'package:mysmartfridge/features/inventory/domain/inventory_models.dart';

void main() {
  group('helpers de péremption', () {
    test('expiryLabel', () {
      expect(expiryLabel(-3), 'Périmé depuis 3 j');
      expect(expiryLabel(0), "Expire aujourd'hui");
      expect(expiryLabel(1), 'Demain');
      expect(expiryLabel(5), 'Dans 5 jours');
    });

    test('daysUntilExpiry compte en jours calendaires', () {
      final now = DateTime.now();
      final midnight = DateTime(now.year, now.month, now.day);
      expect(daysUntilExpiry(midnight.add(const Duration(days: 3))), 3);
      expect(daysUntilExpiry(midnight.subtract(const Duration(days: 2))), -2);
    });
  });

  group('groupProductsByLocation', () {
    const fridge = Location(id: '1', name: 'Frigo', type: 'fridge');
    const pantry = Location(id: '2', name: 'Placard', type: 'pantry');
    Product p(String id, String? locationId) =>
        Product(id: id, name: 'produit $id', locationId: locationId);

    test('groupe par emplacement, dans l\'ordre fourni', () {
      final groups = groupProductsByLocation(
        [p('a', '1'), p('b', '2'), p('c', '1')],
        [fridge, pantry],
      );
      expect(groups.length, 2);
      expect(groups[0].label, 'Frigo');
      expect(groups[0].products.map((e) => e.id).toList(), ['a', 'c']);
      expect(groups[1].label, 'Placard');
      expect(groups[1].products.map((e) => e.id).toList(), ['b']);
    });

    test('omet les emplacements sans produit', () {
      final groups = groupProductsByLocation([p('a', '1')], [fridge, pantry]);
      expect(groups.length, 1);
      expect(groups.single.label, 'Frigo');
    });

    test('produits sans emplacement connu → groupe « Autres » en dernier', () {
      final groups = groupProductsByLocation(
        [p('a', '1'), p('b', '99'), p('c', null)],
        [fridge],
      );
      expect(groups.length, 2);
      expect(groups.first.label, 'Frigo');
      expect(groups.last.label, 'Autres');
      expect(groups.last.location, isNull);
      expect(groups.last.products.map((e) => e.id).toList(), ['b', 'c']);
    });

    test('aucun produit → aucun groupe', () {
      expect(groupProductsByLocation([], [fridge]), isEmpty);
    });
  });
}
