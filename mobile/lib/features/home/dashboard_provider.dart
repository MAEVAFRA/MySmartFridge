import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../inventory/data/inventory_repository.dart';
import '../inventory/domain/inventory_models.dart';

/// Un emplacement et le nombre de produits qu'il contient.
class LocationCount {
  const LocationCount(this.location, this.count);
  final Location location;
  final int count;
}

/// Données agrégées du tableau de bord.
class DashboardData {
  const DashboardData({
    required this.totalProducts,
    required this.locations,
    required this.expiring,
  });

  final int totalProducts;
  final List<LocationCount> locations;
  final List<Product> expiring;
}

/// Charge en parallèle produits + péremptions + emplacements et agrège le tout.
final dashboardProvider = FutureProvider.autoDispose<DashboardData>((ref) async {
  final repo = ref.read(inventoryRepositoryProvider);

  final productsF = repo.getProducts();
  final expiringF = repo.getExpiring(days: 7);
  final locationsF = repo.getLocations();

  final products = await productsF;
  final expiring = await expiringF;
  final locations = await locationsF;

  final counts = locations
      .map((loc) => LocationCount(
            loc,
            products.where((p) => p.locationId == loc.id).length,
          ))
      .toList();

  return DashboardData(
    totalProducts: products.length,
    locations: counts,
    expiring: expiring.take(5).toList(),
  );
});
