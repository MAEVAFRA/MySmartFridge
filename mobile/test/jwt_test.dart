import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mysmartfridge/features/auth/domain/auth_models.dart';
import 'package:mysmartfridge/features/auth/domain/jwt.dart';

/// Fabrique un JWT non signé (header.payload.signature) avec une charge utile
/// donnée, sans padding base64 comme les vrais tokens.
String _makeJwt(Map<String, dynamic> payload) {
  String seg(Map<String, dynamic> map) =>
      base64Url.encode(utf8.encode(jsonEncode(map))).replaceAll('=', '');
  return '${seg({'alg': 'HS256', 'typ': 'JWT'})}.${seg(payload)}.signature';
}

void main() {
  group('JwtPayload.tryDecode', () {
    test('décode id et email', () {
      final p = JwtPayload.tryDecode(
        _makeJwt({'id': 1, 'email': 'alice@demo.com'}),
      );
      expect(p, isNotNull);
      expect(p!.id, '1');
      expect(p.email, 'alice@demo.com');
    });

    test('renvoie null sur un token malformé', () {
      expect(JwtPayload.tryDecode('pas-un-jwt'), isNull);
      expect(JwtPayload.tryDecode('a.b'), isNull);
      expect(JwtPayload.tryDecode('a.!!!.c'), isNull);
    });

    test('isExpired vrai pour un exp passé', () {
      final past = DateTime.now().subtract(const Duration(hours: 1));
      final p = JwtPayload.tryDecode(
        _makeJwt({'exp': past.millisecondsSinceEpoch ~/ 1000}),
      );
      expect(p!.isExpired, isTrue);
    });

    test('isExpired faux pour un exp futur', () {
      final future = DateTime.now().add(const Duration(hours: 1));
      final p = JwtPayload.tryDecode(
        _makeJwt({'exp': future.millisecondsSinceEpoch ~/ 1000}),
      );
      expect(p!.isExpired, isFalse);
    });

    test('un token sans exp est considéré non expiré', () {
      final p = JwtPayload.tryDecode(_makeJwt({'id': 1, 'email': 'a@b.c'}));
      expect(p!.expiresAt, isNull);
      expect(p.isExpired, isFalse);
    });
  });

  group('User.fromJwt', () {
    test('dérive un nom lisible depuis un email composé', () {
      final p =
          JwtPayload.tryDecode(_makeJwt({'id': 7, 'email': 'omar.amri@x.com'}))!;
      final u = User.fromJwt(p);
      expect(u.id, '7');
      expect(u.email, 'omar.amri@x.com');
      expect(u.name, 'Omar Amri');
      expect(u.households, isEmpty);
    });

    test('email simple → prénom capitalisé', () {
      final p =
          JwtPayload.tryDecode(_makeJwt({'id': 1, 'email': 'alice@demo.com'}))!;
      expect(User.fromJwt(p).name, 'Alice');
    });
  });
}
