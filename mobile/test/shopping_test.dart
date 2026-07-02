import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mysmartfridge/features/inventory/domain/inventory_models.dart';
import 'package:mysmartfridge/features/shopping/domain/shopping_models.dart';

void main() {
  group('PendingCheck (file hors ligne SHOP-8)', () {
    test('toJson / fromJson font un aller-retour fidèle', () {
      const check = PendingCheck(listId: '7', checked: true);
      final json = check.toJson();
      expect(json, {'list_id': '7', 'checked': true});

      final restored = PendingCheck.fromJson(json);
      expect(restored.listId, '7');
      expect(restored.checked, isTrue);
    });

    test('fromJson coerce l\'id en chaîne et checked non-true → false', () {
      final restored = PendingCheck.fromJson({'list_id': 7, 'checked': 0});
      expect(restored.listId, '7');
      expect(restored.checked, isFalse);
    });

    test('la file survit à un encodage JSON (comme dans le stockage)', () {
      final pending = {
        'a': const PendingCheck(listId: '1', checked: true),
        'b': const PendingCheck(listId: '2', checked: false),
      };
      // Reproduit l'encodage utilisé par ShoppingSyncStorage.
      final encoded =
          jsonEncode(pending.map((id, c) => MapEntry(id, c.toJson())));
      final decoded = (jsonDecode(encoded) as Map<String, dynamic>).map(
        (id, v) => MapEntry(id, PendingCheck.fromJson(v as Map<String, dynamic>)),
      );

      expect(decoded.keys.toSet(), {'a', 'b'});
      expect(decoded['a']!.listId, '1');
      expect(decoded['a']!.checked, isTrue);
      expect(decoded['b']!.checked, isFalse);
    });
  });

  group('InventoryAddResult / TransferResult', () {
    test('InventoryAddResult.fromJson lit added/skipped', () {
      final r = InventoryAddResult.fromJson({'added': 3, 'skipped': 1});
      expect(r.added, 3);
      expect(r.skipped, 1);
    });

    test('InventoryAddResult.fromJson tolère l\'absence de champs', () {
      final r = InventoryAddResult.fromJson({});
      expect(r.added, 0);
      expect(r.skipped, 0);
    });

    test('TransferResult.fromJson lit transferred/location', () {
      final r =
          TransferResult.fromJson({'transferred': 2, 'location': 'Frigo'});
      expect(r.transferred, 2);
      expect(r.location, 'Frigo');
    });

    test('TransferResult.fromJson tolère location nulle', () {
      final r = TransferResult.fromJson({'transferred': 0, 'location': null});
      expect(r.transferred, 0);
      expect(r.location, isNull);
    });
  });

  group('Product.isLowStock (filtre « stock bas » SHOP-6)', () {
    Product p({num? quantity, num? quantityMin}) =>
        Product(id: '1', name: 'x', quantity: quantity, quantityMin: quantityMin);

    test('quantité au niveau du seuil ou en dessous → stock bas', () {
      expect(p(quantity: 1, quantityMin: 2).isLowStock, isTrue);
      expect(p(quantity: 2, quantityMin: 2).isLowStock, isTrue); // borne
    });

    test('quantité au-dessus du seuil → pas stock bas', () {
      expect(p(quantity: 5, quantityMin: 2).isLowStock, isFalse);
    });

    test('seuil nul ou absent → jamais stock bas', () {
      expect(p(quantity: 0, quantityMin: 0).isLowStock, isFalse);
      expect(p(quantity: 1).isLowStock, isFalse);
    });

    test('quantité inconnue → pas stock bas', () {
      expect(p(quantityMin: 2).isLowStock, isFalse);
    });

    test('fromJson lit quantity_min', () {
      final product = Product.fromJson({
        'id': 1,
        'name': 'Lait',
        'quantity': 1,
        'quantity_min': 3,
      });
      expect(product.quantityMin, 3);
      expect(product.isLowStock, isTrue);
    });
  });

  group('Location.isDefault (transfert SHOP-7)', () {
    test('fromJson lit is_default', () {
      final loc = Location.fromJson(
          {'id': 1, 'name': 'Frigo', 'type': 'fridge', 'is_default': true});
      expect(loc.isDefault, isTrue);
    });

    test('is_default absent → false', () {
      final loc = Location.fromJson({'id': 2, 'name': 'Placard'});
      expect(loc.isDefault, isFalse);
    });
  });
}
