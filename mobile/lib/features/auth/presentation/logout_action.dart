import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/auth_controller.dart';

/// Demande confirmation à l'utilisateur, puis le déconnecte (HOME-4 / MORE-2).
///
/// Partagé entre le dashboard (bouton AppBar) et le menu « Plus » pour une seule
/// et même expérience. Utilise un `AlertDialog` Flutter natif — jamais de
/// dialogue navigateur. Sans effet si l'utilisateur annule.
Future<void> confirmAndLogout(BuildContext context, WidgetRef ref) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Se déconnecter ?'),
      content: const Text(
        'Tu devras te reconnecter avec ton email et ton mot de passe.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(false),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(dialogContext).pop(true),
          child: const Text('Se déconnecter'),
        ),
      ],
    ),
  );
  if (confirmed == true) {
    await ref.read(authControllerProvider.notifier).logout();
  }
}
