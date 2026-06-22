/// Configuration d'environnement de l'application.
///
/// Surcharge possible au lancement, sans toucher au code :
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.20:3001/api
class Env {
  const Env._();

  /// URL de base de l'API backend (Node/Express).
  ///
  /// Valeurs typiques selon la cible d'exécution :
  ///  - Émulateur Android : `http://10.0.2.2:3001/api` (10.0.2.2 = localhost du PC hôte)
  ///  - Simulateur iOS     : `http://localhost:3001/api`
  ///  - Téléphone physique  : `http://[IP_LOCALE_DU_PC]:3001/api`
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3001/api',
  );
}
