import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../application/auth_controller.dart';
import '../data/auth_repository.dart';
import 'widgets/auth_scaffold.dart';
import 'widgets/auth_widgets.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_formKey.currentState!.validate()) return;
    final name =
        '${_firstNameCtrl.text.trim()} ${_lastNameCtrl.text.trim()}'.trim();
    setState(() => _loading = true);
    try {
      await ref.read(authControllerProvider.notifier).register(
            name: name,
            email: _emailCtrl.text.trim(),
            password: _passwordCtrl.text,
          );
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
      subtitle: 'Créez votre compte',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null) ...[
              AuthErrorBanner(message: _error!),
              const SizedBox(height: 16),
            ],
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _firstNameCtrl,
                    textInputAction: TextInputAction.next,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Prénom'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Requis' : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _lastNameCtrl,
                    textInputAction: TextInputAction.next,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Nom'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Requis' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.email],
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.mail_outline),
              ),
              validator: _validateEmail,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _passwordCtrl,
              obscureText: _obscure,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: 'Mot de passe',
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_obscure
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
              validator: (v) =>
                  (v == null || v.length < 6) ? '6 caractères minimum' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _confirmCtrl,
              obscureText: _obscure,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
              decoration: const InputDecoration(
                labelText: 'Confirmer le mot de passe',
                prefixIcon: Icon(Icons.lock_outline),
              ),
              validator: (v) => (v != _passwordCtrl.text)
                  ? 'Les mots de passe ne correspondent pas'
                  : null,
            ),
            const SizedBox(height: 20),
            AuthSubmitButton(
                label: "S'inscrire", loading: _loading, onPressed: _submit),
            const SizedBox(height: 8),
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text('Déjà un compte ?',
                    style: TextStyle(color: AppColors.textSecondary)),
                TextButton(
                  onPressed: _loading ? null : () => context.pop(),
                  child: const Text('Se connecter'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String? _validateEmail(String? v) {
    final value = v?.trim() ?? '';
    if (value.isEmpty) return 'Email requis';
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)) {
      return 'Email invalide';
    }
    return null;
  }
}
