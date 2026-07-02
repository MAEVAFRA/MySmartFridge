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

  group('ProductInput.toJson', () {
    test('inclut les champs renseignés, omet les vides', () {
      final json = const ProductInput(
        name: 'Tomates',
        locationId: '1',
        categoryId: '2',
        quantity: 3,
        unit: 'pièce',
      ).toJson();
      expect(json['name'], 'Tomates');
      expect(json['location_id'], '1');
      expect(json['category_id'], '2');
      expect(json['quantity'], 3);
      expect(json['unit'], 'pièce');
      expect(json.containsKey('expires_at'), isFalse);
      expect(json.containsKey('barcode'), isFalse);
    });

    test('formate expires_at en YYYY-MM-DD', () {
      final json = ProductInput(
        name: 'Lait',
        locationId: '1',
        expiresAt: DateTime(2026, 7, 1),
      ).toJson();
      expect(json['expires_at'], '2026-07-01');
    });

    test('omet quantité nulle et unité vide', () {
      final json =
          const ProductInput(name: 'X', locationId: '1', unit: '').toJson();
      expect(json.containsKey('quantity'), isFalse);
      expect(json.containsKey('unit'), isFalse);
    });
  });

  group('ProductInput.toUpdateJson', () {
    test('envoie null explicite pour vider les champs optionnels', () {
      final json = const ProductInput(name: 'Tomates', locationId: '1')
          .toUpdateJson();
      // Les clés doivent être présentes (à null) pour effacer côté serveur.
      expect(json.containsKey('category_id'), isTrue);
      expect(json['category_id'], isNull);
      expect(json.containsKey('expires_at'), isTrue);
      expect(json['expires_at'], isNull);
      expect(json['barcode'], isNull);
      expect(json['brand'], isNull);
      expect(json['notes'], isNull);
    });

    test('omet price ; image_url seulement si la photo a changé (INV-10)', () {
      // Photo non modifiée : image_url omis → le backend préserve l'existante.
      final untouched = const ProductInput(name: 'X', locationId: '1')
          .toUpdateJson();
      expect(untouched.containsKey('price'), isFalse);
      expect(untouched.containsKey('image_url'), isFalse);

      // Photo retirée : image_url présent à null → efface côté serveur.
      final cleared = const ProductInput(
        name: 'X',
        locationId: '1',
        imageUrl: null,
        includeImage: true,
      ).toUpdateJson();
      expect(cleared.containsKey('image_url'), isTrue);
      expect(cleared['image_url'], isNull);

      // Nouvelle photo : image_url présent avec la data-URL.
      final set = const ProductInput(
        name: 'X',
        locationId: '1',
        imageUrl: 'data:image/jpeg;base64,AAAA',
        includeImage: true,
      ).toUpdateJson();
      expect(set['image_url'], 'data:image/jpeg;base64,AAAA');
    });

    test('toJson (création) inclut image_url si une photo est fournie', () {
      final json = const ProductInput(
        name: 'X',
        locationId: '1',
        imageUrl: 'data:image/jpeg;base64,AAAA',
      ).toJson();
      expect(json['image_url'], 'data:image/jpeg;base64,AAAA');
      // Sans photo : clé absente.
      final empty =
          const ProductInput(name: 'X', locationId: '1').toJson();
      expect(empty.containsKey('image_url'), isFalse);
    });

    test('sérialise les champs renseignés', () {
      final json = ProductInput(
        name: 'Lait',
        locationId: '1',
        categoryId: '2',
        quantity: 2,
        unit: 'L',
        expiresAt: DateTime(2026, 7, 1),
        barcode: '123',
        brand: 'Lactel',
        notes: 'entamé',
      ).toUpdateJson();
      expect(json['name'], 'Lait');
      expect(json['location_id'], '1');
      expect(json['category_id'], '2');
      expect(json['quantity'], 2);
      expect(json['unit'], 'L');
      expect(json['expires_at'], '2026-07-01');
      expect(json['barcode'], '123');
      expect(json['brand'], 'Lactel');
      expect(json['notes'], 'entamé');
    });
  });

  group('estimation de la date de péremption (INV-9)', () {
    const legumes = Category(
      id: '1',
      name: 'Légumes',
      avgShelfDays: 7,
      avgShelfDaysFreezer: 180,
    );
    const epicerie = Category(id: '2', name: 'Épicerie', avgShelfDays: 180);
    const sansDuree = Category(id: '3', name: 'Autre');

    test('estimateShelfDays privilégie le congélateur si renseigné', () {
      expect(estimateShelfDays(legumes, 'freezer'), 180);
      expect(estimateShelfDays(legumes, 'fridge'), 7);
      expect(estimateShelfDays(legumes, null), 7);
    });

    test('estimateShelfDays retombe sur avg_shelf_days sans variante congélo',
        () {
      expect(estimateShelfDays(epicerie, 'freezer'), 180);
    });

    test('estimateShelfDays nul si la catégorie n\'a pas de durée', () {
      expect(estimateShelfDays(sansDuree, 'fridge'), isNull);
    });

    test('estimateExpiryDate ajoute la durée à la date de base', () {
      final from = DateTime(2026, 7, 2);
      expect(estimateExpiryDate(legumes, 'fridge', from: from),
          DateTime(2026, 7, 9));
      expect(estimateExpiryDate(legumes, 'freezer', from: from),
          DateTime(2026, 12, 29));
    });

    test('estimateExpiryDate nul sans durée', () {
      expect(estimateExpiryDate(sansDuree, 'fridge', from: DateTime(2026, 7, 2)),
          isNull);
    });

    test('Category.fromJson lit les durées de conservation', () {
      final cat = Category.fromJson({
        'id': 5,
        'name': 'Produits laitiers',
        'icon': '🥛',
        'color': '#f59e0b',
        'avg_shelf_days': 10,
        'avg_shelf_days_opened': 3,
        'avg_shelf_days_freezer': null,
        'is_system': true,
      });
      expect(cat.avgShelfDays, 10);
      expect(cat.avgShelfDaysOpened, 3);
      expect(cat.avgShelfDaysFreezer, isNull);
      expect(cat.isSystem, isTrue);
    });
  });

  group('Product.fromJson', () {
    test('lit les champs et la catégorie imbriquée', () {
      final product = Product.fromJson({
        'id': 5,
        'name': 'Champignons',
        'location_id': 1,
        'category_id': 1,
        'location': {'id': 1, 'name': 'Frigo'},
        'category': {'id': 1, 'name': 'Légumes', 'icon': '🥦'},
        'quantity': 50,
        'unit': 'g',
        'expires_at': '2026-04-28',
      });
      expect(product.locationId, '1');
      expect(product.locationName, 'Frigo');
      expect(product.categoryId, '1');
      expect(product.categoryName, 'Légumes');
      expect(product.categoryIcon, '🥦');
      expect(product.quantity, 50);
      expect(product.unit, 'g');
      expect(product.expiresAt, DateTime(2026, 4, 28));
    });
  });
}
