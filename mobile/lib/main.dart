import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

import 'app.dart';
import 'core/network/api_client.dart';
import 'core/storage/settings_storage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Données de locale FR pour les dates (noms de jours/mois) — l'app est en
  // français ; sans cela, `DateFormat(..., 'fr_FR')` lèverait une exception.
  Intl.defaultLocale = 'fr_FR';
  await initializeDateFormatting('fr_FR');

  // On charge l'URL du backend éventuellement configurée par l'utilisateur
  // AVANT de construire l'app, pour que le client réseau démarre sur la bonne
  // cible (sinon la première requête partirait vers l'URL par défaut).
  final savedApiBaseUrl =
      await SettingsStorage(const FlutterSecureStorage()).readApiBaseUrl();

  runApp(
    ProviderScope(
      overrides: [
        if (savedApiBaseUrl != null && savedApiBaseUrl.isNotEmpty)
          apiBaseUrlProvider
              .overrideWith(() => ApiBaseUrlController(savedApiBaseUrl)),
      ],
      child: const MySmartFridgeApp(),
    ),
  );
}
