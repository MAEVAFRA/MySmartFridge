import 'package:flutter_test/flutter_test.dart';
import 'package:mysmartfridge/features/expiring/application/expiring_providers.dart';
import 'package:mysmartfridge/features/inventory/domain/inventory_models.dart';

/// Tests de `splitExpiring` (EXP-1) : répartition périmés / à venir, pure et
/// découplée de l'UI.
void main() {
  final now = DateTime.now();
  DateTime inDays(int d) => DateTime(now.year, now.month, now.day + d);

  Product product(String id, int? offsetDays) => Product(
        id: id,
        name: 'Produit $id',
        expiresAt: offsetDays == null ? null : inDays(offsetDays),
      );

  test('sépare périmés (< 0 j) et à venir ; aujourd\'hui compte comme à venir',
      () {
    final buckets = splitExpiring([
      product('1', -3),
      product('2', -1),
      product('3', 0),
      product('4', 5),
    ]);
    expect(buckets.expired.map((p) => p.id), ['1', '2']);
    expect(buckets.upcoming.map((p) => p.id), ['3', '4']);
  });

  test('ignore les produits sans date de péremption', () {
    final buckets = splitExpiring([product('1', null), product('2', 2)]);
    expect(buckets.expired, isEmpty);
    expect(buckets.upcoming.map((p) => p.id), ['2']);
  });

  test('préserve l\'ordre fourni par l\'API dans chaque paquet', () {
    final buckets = splitExpiring([
      product('a', -5),
      product('b', -2),
      product('c', 1),
      product('d', 9),
    ]);
    expect(buckets.expired.map((p) => p.id), ['a', 'b']);
    expect(buckets.upcoming.map((p) => p.id), ['c', 'd']);
  });

  test('listes vides quand aucun produit', () {
    final buckets = splitExpiring(const []);
    expect(buckets.expired, isEmpty);
    expect(buckets.upcoming, isEmpty);
  });

  test('fenêtres proposées : 3 / 7 / 14 / 30 jours', () {
    expect(expiryWindows, [3, 7, 14, 30]);
  });
}
