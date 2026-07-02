/// Métadonnées statiques de l'application, affichées dans « À propos » (MORE-3).
/// La version, elle, est lue à l'exécution via `package_info_plus`.
class AppInfo {
  const AppInfo._();

  static const String name = 'MySmartFridge';

  static const String tagline =
      'Votre compagnon anti-gaspillage : gérez votre frigo, vos courses et '
      'vos dépenses, et scannez vos produits en mobilité.';

  /// Application mobile compagnon de la plateforme web MySmartFridge.
  static const String legal = '© 2026 MySmartFridge';
}
