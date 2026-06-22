import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../application/auth_controller.dart';
import '../data/auth_repository.dart';
import 'widgets/auth_scaffold.dart';
import 'widgets/auth_widgets.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  bool _loading = false;
  String? _error;
  String? _successMessage;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final message = await ref
          .read(authControllerProvider.notifier)
          .forgotPassword(_emailCtrl.text.trim());
      if (mounted) setState(() => _successMessage = message);
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Une erreur inattendue est survenue.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      subtitle: 'Réinitialiser votre mot de passe',
      child: _successMessage != null
          ? _buildSuccess(context)
          : _buildForm(context),
    );
  }

  Widget _buildSuccess(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Icon(Icons.mark_email_read_outlined,
            color: AppColors.success, size: 48),
        const SizedBox(height: 16),
        Text(
          _successMessage!,
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.textSecondary, height: 1.4),
        ),
        const SizedBox(height: 24),
        SizedBox(
          height: 50,
          child: ElevatedButton(
            onPressed: () => context.pop(),
            child: const Text('Retour à la connexion'),
          ),
        ),
      ],
    );
  }

  Widget _buildForm(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Saisis ton email : si un compte existe, tu recevras un lien pour réinitialiser ton mot de passe.',
            style:
                TextStyle(color: AppColors.textSecondary, fontSize: 14, height: 1.4),
          ),
          const SizedBox(height: 16),
          if (_error != null) ...[
            AuthErrorBanner(message: _error!),
            const SizedBox(height: 16),
          ],
          TextFormField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.email],
            onFieldSubmitted: (_) => _submit(),
            decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.mail_outline),
            ),
            validator: (v) {
              final value = v?.trim() ?? '';
              if (value.isEmpty) return 'Email requis';
              if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)) {
                return 'Email invalide';
              }
              return null;
            },
          ),
          const SizedBox(height: 20),
          AuthSubmitButton(
              label: 'Envoyer le lien', loading: _loading, onPressed: _submit),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: _loading ? null : () => context.pop(),
              child: const Text('Retour à la connexion'),
            ),
          ),
        ],
      ),
    );
  }
}
