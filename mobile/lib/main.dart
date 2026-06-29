import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

import 'app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Données de locale FR pour les dates (noms de jours/mois) — l'app est en
  // français ; sans cela, `DateFormat(..., 'fr_FR')` lèverait une exception.
  Intl.defaultLocale = 'fr_FR';
  await initializeDateFormatting('fr_FR');

  runApp(
    const ProviderScope(
      child: MySmartFridgeApp(),
    ),
  );
}
