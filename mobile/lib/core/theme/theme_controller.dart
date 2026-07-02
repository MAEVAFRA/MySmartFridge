import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';

/// Convertit la valeur persistée (`'light'`/`'dark'`/`'system'`) en [ThemeMode].
/// Toute valeur inconnue ou absente retombe sur « suivre le système ».
ThemeMode themeModeFromString(String? value) {
  switch (value) {
    case 'light':
      return ThemeMode.light;
    case 'dark':
      return ThemeMode.dark;
    default:
      return ThemeMode.system;
  }
}

/// Représentation persistée d'un [ThemeMode].
String themeModeToString(ThemeMode mode) {
  switch (mode) {
    case ThemeMode.light:
      return 'light';
    case ThemeMode.dark:
      return 'dark';
    case ThemeMode.system:
      return 'system';
  }
}

/// Mode de thème choisi par l'utilisateur (clair / sombre / système), persisté
/// sur l'appareil (MORE-3).
///
/// La valeur initiale est injectée au démarrage via un override dans `main`
/// (même mécanique que l'URL de l'API), pour éviter un flash de thème au lancement.
class ThemeModeController extends Notifier<ThemeMode> {
  ThemeModeController(this._initial);

  final ThemeMode _initial;

  @override
  ThemeMode build() => _initial;

  /// Applique et persiste [mode]. `MaterialApp` surveille cet état, le
  /// changement est donc immédiat.
  Future<void> set(ThemeMode mode) async {
    await ref.read(settingsStorageProvider).writeThemeMode(themeModeToString(mode));
    state = mode;
  }
}

final themeModeProvider = NotifierProvider<ThemeModeController, ThemeMode>(
  () => ThemeModeController(ThemeMode.system),
);
