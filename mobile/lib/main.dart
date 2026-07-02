import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

import 'app.dart';
import 'core/network/api_client.dart';
import 'core/storage/settings_storage.dart';
import 'core/theme/theme_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Données de locale FR pour les dates (noms de jours/mois) — l'app est en
  // français ; sans cela, `DateFormat(..., 'fr_FR')` lèverait une exception.
  Intl.defaultLocale = 'fr_FR';
  await initializeDateFormatting('fr_FR');

  // On charge les réglages persistés AVANT de construire l'app :
  //  - l'URL du backend, pour que le client réseau démarre sur la bonne cible ;
  //  - le mode de thème, pour éviter un flash de thème au lancement.
  final settings = SettingsStorage(const FlutterSecureStorage());
  final savedApiBaseUrl = await settings.readApiBaseUrl();
  final savedThemeMode = themeModeFromString(await settings.readThemeMode());

  runApp(
    ProviderScope(
      overrides: [
        if (savedApiBaseUrl != null && savedApiBaseUrl.isNotEmpty)
          apiBaseUrlProvider
              .overrideWith(() => ApiBaseUrlController(savedApiBaseUrl)),
        themeModeProvider.overrideWith(() => ThemeModeController(savedThemeMode)),
      ],
      child: const MySmartFridgeApp(),
    ),
  );
}
