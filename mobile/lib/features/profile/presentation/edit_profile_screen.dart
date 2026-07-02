import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/error_banner.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/auth_models.dart';
import '../application/profile_providers.dart';
import '../data/avatar_service.dart';
import 'widgets/profile_avatar.dart';

/// Action choisie dans la feuille de sélection de photo.
enum _PhotoAction { camera, gallery, remove }

/// PROF-2 + PROF-3 — Édition du profil : nom, email, régimes/allergies, et
/// photo (galerie/caméra, compressée avant envoi ; retrait possible).
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key, this.initial});

  /// Profil pré-chargé transmis par l'écran précédent. Nullable pour couvrir un
  /// accès direct (deep link) : on retombe alors sur le profil déjà en cache.
  final User? initial;

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _emailCtrl;
  late final TextEditingController _dietaryCtrl;
  late final TextEditingController _allergiesCtrl;

  String? _avatarUrl;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // On privilégie le profil transmis, sinon celui déjà en cache (/auth/me).
    final user = widget.initial ?? ref.read(profileProvider).asData?.value;
    _nameCtrl = TextEditingController(text: user?.name ?? '');
    _emailCtrl = TextEditingController(text: user?.email ?? '');
    _dietaryCtrl = TextEditingController(text: user?.dietaryPreferences ?? '');
    _allergiesCtrl = TextEditingController(text: user?.allergies ?? '');
    _avatarUrl = user?.avatarUrl;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _dietaryCtrl.dispose();
    _allergiesCtrl.dispose();
    super.dispose();
  }

  Future<void> _choosePhoto() async {
    FocusScope.of(context).unfocus();
    final hasPhoto = _avatarUrl != null && _avatarUrl!.isNotEmpty;
    final action = await showModalBottomSheet<_PhotoAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Prendre une photo'),
              onTap: () => Navigator.pop(context, _PhotoAction.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choisir dans la galerie'),
              onTap: () => Navigator.pop(context, _PhotoAction.gallery),
            ),
            if (hasPhoto)
              ListTile(
                leading: const Icon(Icons.delete_outline, color: AppColors.error),
                title: const Text('Retirer la photo',
                    style: TextStyle(color: AppColors.error)),
                onTap: () => Navigator.pop(context, _PhotoAction.remove),
              ),
          ],
        ),
      ),
    );
    if (action == null || !mounted) return;

    if (action == _PhotoAction.remove) {
      setState(() => _avatarUrl = null);
      return;
    }

    final source =
        action == _PhotoAction.camera ? ImageSource.camera : ImageSource.gallery;
    try {
      final dataUrl = await pickAvatarDataUrl(source);
      if (dataUrl != null && mounted) setState(() => _avatarUrl = dataUrl);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(source == ImageSource.camera
              ? "Impossible d'accéder à la caméra. Vérifie l'autorisation dans les réglages."
              : "Impossible d'accéder aux photos."),
        ),
      );
    }
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    setState(() => _error = null);
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);
    try {
      final updated = await ref.read(authRepositoryProvider).updateProfile(
            name: _nameCtrl.text.trim(),
            email: _emailCtrl.text.trim(),
            avatarUrl: _avatarUrl,
            dietaryPreferences: _dietaryCtrl.text.trim(),
            allergies: _allergiesCtrl.text.trim(),
          );
      // Propage à l'app (salutation, avatar) et rafraîchit l'écran profil.
      ref.read(authControllerProvider.notifier).setUser(updated);
      ref.invalidate(profileProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profil mis à jour')),
      );
      context.pop();
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Une erreur inattendue est survenue.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Modifier le profil',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (_error != null) ...[
              ErrorBanner(message: _error!),
              const SizedBox(height: 16),
            ],
            Center(
              child: Column(
                children: [
                  Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      ProfileAvatar(
                        avatarUrl: _avatarUrl,
                        name: _nameCtrl.text,
                        radius: 48,
                      ),
                      Material(
                        color: AppColors.primary,
                        shape: const CircleBorder(),
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: _loading ? null : _choosePhoto,
                          child: const Padding(
                            padding: EdgeInsets.all(8),
                            child: Icon(Icons.photo_camera,
                                size: 18, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _loading ? null : _choosePhoto,
                    child: const Text('Changer la photo'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _nameCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Nom',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Le nom est requis' : null,
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
              controller: _dietaryCtrl,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Préférences alimentaires',
                hintText: 'Ex : végétarien, sans gluten',
                helperText: 'Séparez par des virgules',
                prefixIcon: Icon(Icons.restaurant_menu),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _allergiesCtrl,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _save(),
              decoration: const InputDecoration(
                labelText: 'Allergies',
                hintText: 'Ex : arachides, lactose',
                helperText: 'Séparez par des virgules',
                prefixIcon: Icon(Icons.health_and_safety_outlined),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _loading ? null : _save,
              icon: _loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.save_outlined),
              label: Text(_loading ? 'Enregistrement…' : 'Enregistrer'),
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
