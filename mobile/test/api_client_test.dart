import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mysmartfridge/core/network/api_client.dart';

/// Construit une [DioException] minimale pour un statut HTTP et un chemin donnés.
/// Un `status` nul simule une erreur réseau (pas de réponse).
DioException _error(int? status, String path) {
  final request = RequestOptions(path: path);
  return DioException(
    requestOptions: request,
    type: status == null
        ? DioExceptionType.connectionError
        : DioExceptionType.badResponse,
    response: status == null
        ? null
        : Response<dynamic>(requestOptions: request, statusCode: status),
  );
}

void main() {
  group('isSessionExpiredError', () {
    test('401 sur une requête authentifiée → true', () {
      expect(isSessionExpiredError(_error(401, '/products')), isTrue);
      expect(isSessionExpiredError(_error(401, '/auth/me')), isTrue);
      expect(isSessionExpiredError(_error(401, '/shopping-lists')), isTrue);
      expect(isSessionExpiredError(_error(401, '/households/3')), isTrue);
    });

    test("401 sur un endpoint d'auth public → false", () {
      expect(isSessionExpiredError(_error(401, '/auth/login')), isFalse);
      expect(isSessionExpiredError(_error(401, '/auth/register')), isFalse);
      expect(isSessionExpiredError(_error(401, '/auth/forgot-password')), isFalse);
      expect(isSessionExpiredError(_error(401, '/auth/reset-password')), isFalse);
    });

    test('autre statut ou erreur réseau → false', () {
      expect(isSessionExpiredError(_error(500, '/products')), isFalse);
      expect(isSessionExpiredError(_error(403, '/products')), isFalse);
      expect(isSessionExpiredError(_error(404, '/products')), isFalse);
      expect(isSessionExpiredError(_error(null, '/products')), isFalse);
    });
  });
}
