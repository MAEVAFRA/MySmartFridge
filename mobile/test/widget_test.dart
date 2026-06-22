import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mysmartfridge/features/home/home_screen.dart';

void main() {
  testWidgets("HomeScreen affiche le nom de l'application", (tester) async {
    await tester.pumpWidget(const MaterialApp(home: HomeScreen()));

    expect(find.text('MySmartFridge'), findsOneWidget);
    expect(find.text('Squelette prêt 🎉'), findsOneWidget);
  });
}
