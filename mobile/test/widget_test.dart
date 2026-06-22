import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mysmartfridge/features/auth/presentation/login_screen.dart';

void main() {
  testWidgets("L'écran de connexion s'affiche", (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: LoginScreen())),
    );

    expect(find.text('MySmartFridge'), findsOneWidget);
    expect(find.text('Se connecter'), findsOneWidget);
    expect(find.text('Mot de passe oublié ?'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });
}
