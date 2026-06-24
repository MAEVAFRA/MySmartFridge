import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/inventory_repository.dart';
import '../domain/inventory_models.dart';

/// Données de l'écran inventaire : produits + emplacements (ces derniers servent
/// au regroupement et fournissent l'ordre d'affichage + l'icône/couleur).
class InventoryData {
  const InventoryData({required this.products, required this.locations});

  final List<Product> products;
  final List<Location> locations;
}

/// Charge produits et emplacements en parallèle.
final inventoryProvider = FutureProvider.autoDispose<InventoryData>((ref) async {
  final repo = ref.read(inventoryRepositoryProvider);
  final productsFuture = repo.getProducts();
  final locationsFuture = repo.getLocations();
  return InventoryData(
    products: await productsFuture,
    locations: await locationsFuture,
  );
});

/// Données nécessaires au formulaire d'ajout : emplacements + catégories.
class AddProductFormData {
  const AddProductFormData({required this.locations, required this.categories});

  final List<Location> locations;
  final List<Category> categories;
}

/// Charge en parallèle emplacements et catégories pour le formulaire d'ajout.
final addProductFormDataProvider =
    FutureProvider.autoDispose<AddProductFormData>((ref) async {
  final repo = ref.read(inventoryRepositoryProvider);
  final locationsFuture = repo.getLocations();
  final categoriesFuture = repo.getCategories();
  return AddProductFormData(
    locations: await locationsFuture,
    categories: await categoriesFuture,
  );
});

/// Un groupe de produits rattachés à un même emplacement (ou « Autres »).
class InventoryGroup {
  const InventoryGroup({
    required this.label,
    required this.products,
    this.location,
  });

  /// `null` pour le groupe « Autres » (produits sans emplacement connu).
  final Location? location;
  final String label;
  final List<Product> products;
}

/// Regroupe les produits par emplacement, dans l'ordre des [locations] fournies.
/// Les emplacements sans produit sont omis ; les produits dont l'emplacement est
/// inconnu sont rassemblés dans un groupe « Autres » placé en dernier.
List<InventoryGroup> groupProductsByLocation(
  List<Product> products,
  List<Location> locations,
) {
  final knownIds = {for (final l in locations) l.id};
  final byLocation = <String, List<Product>>{};
  final orphans = <Product>[];

  for (final product in products) {
    final id = product.locationId;
    if (id != null && knownIds.contains(id)) {
      byLocation.putIfAbsent(id, () => []).add(product);
    } else {
      orphans.add(product);
    }
  }

  final groups = <InventoryGroup>[];
  for (final location in locations) {
    final items = byLocation[location.id];
    if (items != null && items.isNotEmpty) {
      groups.add(InventoryGroup(
        location: location,
        label: location.name,
        products: items,
      ));
    }
  }
  if (orphans.isNotEmpty) {
    groups.add(InventoryGroup(label: 'Autres', products: orphans));
  }
  return groups;
}
