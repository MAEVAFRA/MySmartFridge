import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/expiry.dart';
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

/// Détail d'un produit (INV-5), rafraîchi depuis `GET /products/:id`.
final productDetailProvider =
    FutureProvider.autoDispose.family<Product, String>((ref, id) async {
  final repo = ref.read(inventoryRepositoryProvider);
  return repo.getProduct(id);
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

/// Critère de tri des produits à l'intérieur de chaque groupe d'emplacement.
enum InventorySort {
  /// Plus urgents d'abord (date de péremption croissante, sans date en dernier).
  expiry,

  /// Ordre alphabétique sur le nom.
  name,
}

/// Filtre sur l'état de péremption d'un produit.
enum ExpiryFilter {
  /// Tous les produits.
  all,

  /// Périme dans 7 jours ou moins (non encore périmé).
  soon,

  /// Déjà périmé.
  expired,
}

/// État des contrôles de l'inventaire (recherche / filtres / tri).
class InventoryFilters {
  const InventoryFilters({
    this.search = '',
    this.locationId,
    this.expiry = ExpiryFilter.all,
    this.sort = InventorySort.expiry,
  });

  /// Texte recherché (nom ou marque), insensible à la casse.
  final String search;

  /// Emplacement filtré, ou `null` pour tous les emplacements.
  final String? locationId;
  final ExpiryFilter expiry;
  final InventorySort sort;

  /// Vrai si au moins un filtre (recherche/emplacement/péremption) restreint la
  /// liste — sert à distinguer « inventaire vide » de « aucun résultat ».
  bool get hasActiveFilter =>
      search.trim().isNotEmpty ||
      locationId != null ||
      expiry != ExpiryFilter.all;

  InventoryFilters copyWith({
    String? search,
    Object? locationId = _unset,
    ExpiryFilter? expiry,
    InventorySort? sort,
  }) {
    return InventoryFilters(
      search: search ?? this.search,
      locationId:
          locationId == _unset ? this.locationId : locationId as String?,
      expiry: expiry ?? this.expiry,
      sort: sort ?? this.sort,
    );
  }

  static const _unset = Object();
}

/// État mutable des contrôles de l'inventaire, piloté par l'écran.
class InventoryFiltersNotifier extends Notifier<InventoryFilters> {
  @override
  InventoryFilters build() => const InventoryFilters();

  void setSearch(String value) => state = state.copyWith(search: value);

  void setLocation(String? locationId) =>
      state = state.copyWith(locationId: locationId);

  void setExpiry(ExpiryFilter value) => state = state.copyWith(expiry: value);

  void setSort(InventorySort value) => state = state.copyWith(sort: value);

  void clear() => state = const InventoryFilters();
}

final inventoryFiltersProvider =
    NotifierProvider<InventoryFiltersNotifier, InventoryFilters>(
        InventoryFiltersNotifier.new);

/// Applique [filters] à un produit isolé (recherche + emplacement + péremption).
bool _matchesFilters(Product product, InventoryFilters filters) {
  final query = filters.search.trim().toLowerCase();
  if (query.isNotEmpty) {
    final name = product.name.toLowerCase();
    final brand = product.brand?.toLowerCase() ?? '';
    if (!name.contains(query) && !brand.contains(query)) return false;
  }

  if (filters.locationId != null && product.locationId != filters.locationId) {
    return false;
  }

  switch (filters.expiry) {
    case ExpiryFilter.all:
      break;
    case ExpiryFilter.soon:
      final date = product.expiresAt;
      if (date == null) return false;
      final days = daysUntilExpiry(date);
      if (days < 0 || days > 7) return false;
    case ExpiryFilter.expired:
      final date = product.expiresAt;
      if (date == null || daysUntilExpiry(date) >= 0) return false;
  }

  return true;
}

/// Compare deux produits selon le critère [sort].
int _compareProducts(Product a, Product b, InventorySort sort) {
  switch (sort) {
    case InventorySort.expiry:
      final da = a.expiresAt;
      final db = b.expiresAt;
      // Les produits sans date passent en dernier.
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da.compareTo(db);
    case InventorySort.name:
      return a.name.toLowerCase().compareTo(b.name.toLowerCase());
  }
}

/// Résultat de l'application des filtres : groupes affichables + nombre total de
/// produits correspondants (avant regroupement).
class InventoryView {
  const InventoryView({required this.groups, required this.matchCount});

  final List<InventoryGroup> groups;
  final int matchCount;
}

/// Filtre puis trie les produits, et les regroupe par emplacement pour
/// l'affichage. Le tri s'applique à l'intérieur de chaque groupe ; l'ordre des
/// groupes reste celui des emplacements.
InventoryView buildInventoryView(InventoryData data, InventoryFilters filters) {
  final filtered =
      data.products.where((p) => _matchesFilters(p, filters)).toList()
        ..sort((a, b) => _compareProducts(a, b, filters.sort));
  return InventoryView(
    groups: groupProductsByLocation(filtered, data.locations),
    matchCount: filtered.length,
  );
}
