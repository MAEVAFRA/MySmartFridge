import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mysmartfridge/features/auth/domain/auth_models.dart';
import 'package:mysmartfridge/features/profile/data/avatar_service.dart';

void main() {
  group('User — profil (PROF-1/2)', () {
    test('fromJson lit régimes alimentaires et allergies', () {
      final user = User.fromJson({
        'id': 7,
        'name': 'Omar',
        'email': 'omar@demo.com',
        'avatar_url': 'data:image/jpeg;base64,AAAA',
        'dietary_preferences': 'végétarien, sans gluten',
        'allergies': 'arachides',
      });
      expect(user.id, '7');
      expect(user.dietaryPreferences, 'végétarien, sans gluten');
      expect(user.allergies, 'arachides');
      expect(user.avatarUrl, 'data:image/jpeg;base64,AAAA');
    });

    test('fromJson tolère les champs de profil absents', () {
      final user = User.fromJson({'id': 1, 'name': 'A', 'email': 'a@b.co'});
      expect(user.dietaryPreferences, isNull);
      expect(user.allergies, isNull);
    });

    test('copyWith met à jour un champ sans toucher aux autres', () {
      const user = User(
        id: '1',
        name: 'A',
        email: 'a@b.co',
        avatarUrl: 'x',
        dietaryPreferences: 'veggie',
      );
      final renamed = user.copyWith(name: 'B');
      expect(renamed.name, 'B');
      expect(renamed.avatarUrl, 'x');
      expect(renamed.dietaryPreferences, 'veggie');
    });

    test('copyWith(clearAvatar: true) remet la photo à null', () {
      const user = User(id: '1', name: 'A', email: 'a@b.co', avatarUrl: 'x');
      expect(user.copyWith(clearAvatar: true).avatarUrl, isNull);
    });
  });

  group('avatarImageProvider — photo (PROF-3)', () {
    test('null ou vide → null', () {
      expect(avatarImageProvider(null), isNull);
      expect(avatarImageProvider(''), isNull);
    });

    test('data-URL base64 valide → MemoryImage', () {
      expect(avatarImageProvider('data:image/jpeg;base64,AA=='),
          isA<MemoryImage>());
    });

    test('data-URL au base64 invalide → null (pas de crash)', () {
      expect(avatarImageProvider('data:image/jpeg;base64,@@@'), isNull);
    });

    test('data-URL sans virgule → null', () {
      expect(avatarImageProvider('data:image/jpeg;base64'), isNull);
    });

    test('URL http(s) → NetworkImage', () {
      expect(avatarImageProvider('https://x/y.png'), isA<NetworkImage>());
    });
  });
}
