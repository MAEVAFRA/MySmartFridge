import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/async_state_views.dart';
import '../../home/dashboard_provider.dart';
import '../application/inventory_providers.dart';
import '../data/inventory_repository.dart';
import '../domain/inventory_models.dart';
import 'form_choices.dart';
import 'location_style.dart';

const _emojiPresets = [
  '🥦', '🍎', '🥩', '🐟', '🥛', '🥤', '🫙', '🧂', '❄️', '🍞', //
  '🧀', '🍇', '🍌', '🥚', '🍫', '🍪', '🌭', '🍕', '🍷', '🧃', //
  '🥕', '🍋', '🍓', '🥨', '🍯', '🌶️', '🥫', '🧈', '🍬', '📦', //
];

const _categoryColorPresets = [
  '#22c55e', '#f97316', '#ef4444', '#3b82f6', '#e2e8f0', '#06b6d4',
  '#8b5cf6', '#f59e0b', '#67e8f9', '#d97706', '#ec4899', '#6b7280',
];

/// Profil de conservation : un type simple (frais/sec/congelé) qui fixe les
/// durées de conservation d'une catégorie, comme sur le web.
class _ConservationProfile {
  const _ConservationProfile(
      this.key, this.label, this.icon, this.days, this.freezer, this.description);

  final String key;
  final String label;
  final String icon;
  final int days;
  final int? freezer;
  final String description;
}

const _conservationProfiles = [
  _ConservationProfile('fresh', 'Frais', '🥬', 5, 60,
      'Produit périssable (légumes, viande, produits laitiers…).'),
  _ConservationProfile('dry', 'Sec', '🫙', 180, null,
      'Longue conservation à température ambiante (pâtes, conserves, épicerie…).'),
  _ConservationProfile('frozen', 'Congelé', '❄️', 2, 90,
      'Déjà surgelé, à conserver au congélateur.'),
];

_ConservationProfile? _matchProfile(int? days, int? freezer) {
  for (final p in _conservationProfiles) {
    if (p.days == days && p.freezer == freezer) return p;
  }
  return null;
}

/// Résumé lisible de la conservation d'une catégorie (réutilisé par le détail).
String conservationSummary(Category cat) {
  final p = _matchProfile(cat.avgShelfDays, cat.avgShelfDaysFreezer);
  if (p != null) return 'Conservation : ${p.label}';
  if (cat.avgShelfDays != null || cat.avgShelfDaysFreezer != null) {
    return 'Conservation personnalisée';
  }
  return 'Pas d\'estimation de péremption';
}

/// Écran de gestion des catégories (INV-14) : liste avec comptage produits,
/// création / édition / suppression (durées de conservation via profils).
class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(categoriesAdminProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Catégories',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => showCategoryFormSheet(context, ref),
        tooltip: 'Ajouter une catégorie',
        child: const Icon(Icons.add),
      ),
      body: async.when(
        loading: () => const LoadingView(),
        error: (_, _) => ErrorRetryView(
          title: 'Impossible de charger les catégories',
          onRetry: () => ref.invalidate(categoriesAdminProvider),
        ),
        data: (data) {
          if (data.categories.isEmpty) {
            return RefreshIndicator(
              onRefresh: () => _refresh(ref),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.18),
                  const EmptyView(
                    icon: Icons.category_outlined,
                    title: 'Aucune catégorie',
                    message: 'Crée ta première catégorie.',
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: FilledButton.icon(
                      onPressed: () => showCategoryFormSheet(context, ref),
                      icon: const Icon(Icons.add),
                      label: const Text('Nouvelle catégorie'),
                    ),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => _refresh(ref),
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: data.categories.length,
              itemBuilder: (_, i) {
                final cat = data.categories[i];
                return _CategoryCard(
                  category: cat,
                  count: data.countFor(cat.id),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(categoriesAdminProvider);
    await ref.read(categoriesAdminProvider.future);
  }
}

class _CategoryCard extends ConsumerWidget {
  const _CategoryCard({required this.category, required this.count});

  final Category category;
  final int count;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = parseHexColor(category.colorHex) ?? AppColors.primary;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () =>
              context.push('/categories/${category.id}', extra: category),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: Text(category.icon ?? '📦',
                      style: const TextStyle(fontSize: 22)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        category.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${category.isSystem ? 'Par défaut' : 'Personnalisée'}'
                        ' • $count produit${count > 1 ? 's' : ''}',
                        style: const TextStyle(
                            fontSize: 12.5, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                _CategoryMenu(category: category, count: count),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CategoryMenu extends ConsumerWidget {
  const _CategoryMenu({required this.category, required this.count});

  final Category category;
  final int count;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PopupMenuButton<String>(
      icon: const Icon(Icons.more_vert, color: AppColors.textSecondary),
      onSelected: (value) {
        if (value == 'edit') {
          showCategoryFormSheet(context, ref, editing: category);
        } else if (value == 'delete') {
          confirmDeleteCategory(context, ref, category, count);
        }
      },
      itemBuilder: (_) => const [
        PopupMenuItem(value: 'edit', child: Text('Modifier')),
        PopupMenuItem(value: 'delete', child: Text('Supprimer')),
      ],
    );
  }
}

/// Confirme la suppression d'une catégorie (les produits sont détachés, pas
/// supprimés) puis l'exécute. Retourne `true` si elle a été supprimée.
Future<bool> confirmDeleteCategory(
  BuildContext context,
  WidgetRef ref,
  Category category,
  int count,
) async {
  final messenger = ScaffoldMessenger.of(context);
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text('Supprimer « ${category.name} » ?'),
      content: Text(
        category.isSystem
            ? 'C\'est une catégorie par défaut. La supprimer la retirera des '
                'produits qui l\'utilisent (sans les supprimer).'
            : count > 0
                ? 'Cette catégorie sera retirée de $count produit'
                    '${count > 1 ? 's' : ''} (ils ne seront pas supprimés).'
                : 'Cette catégorie sera définitivement supprimée.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          style: FilledButton.styleFrom(backgroundColor: AppColors.error),
          child: const Text('Supprimer'),
        ),
      ],
    ),
  );
  if (ok != true) return false;
  try {
    await ref.read(inventoryRepositoryProvider).deleteCategory(category.id);
    _invalidateCategoryData(ref);
    messenger.showSnackBar(
      SnackBar(content: Text('« ${category.name} » supprimée')),
    );
    return true;
  } catch (_) {
    messenger.showSnackBar(
      const SnackBar(
          content: Text('Échec de la suppression. Vérifie ta connexion.')),
    );
    return false;
  }
}

/// Invalide les providers dépendant des catégories après une écriture.
void _invalidateCategoryData(WidgetRef ref) {
  ref.invalidate(categoriesAdminProvider);
  ref.invalidate(addProductFormDataProvider);
  ref.invalidate(inventoryProvider);
  ref.invalidate(dashboardProvider);
}

/// Ouvre le formulaire de création / édition d'une catégorie.
Future<void> showCategoryFormSheet(
  BuildContext context,
  WidgetRef ref, {
  Category? editing,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _CategoryFormSheet(editing: editing),
  );
}

class _CategoryFormSheet extends ConsumerStatefulWidget {
  const _CategoryFormSheet({this.editing});

  final Category? editing;

  @override
  ConsumerState<_CategoryFormSheet> createState() => _CategoryFormSheetState();
}

class _CategoryFormSheetState extends ConsumerState<_CategoryFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _nameController =
      TextEditingController(text: widget.editing?.name ?? '');
  final _customEmojiController = TextEditingController();

  late String _icon = widget.editing?.icon ?? '📦';
  late String _color = widget.editing?.colorHex ?? '#6b7280';
  // Durées conservées telles quelles (une valeur personnalisée non issue d'un
  // profil est préservée à l'enregistrement).
  late int? _avgShelfDays = widget.editing?.avgShelfDays;
  late int? _avgShelfDaysFreezer = widget.editing?.avgShelfDaysFreezer;
  late final int? _avgShelfDaysOpened = widget.editing?.avgShelfDaysOpened;
  bool _saving = false;

  bool get _isEditing => widget.editing != null;

  @override
  void dispose() {
    _nameController.dispose();
    _customEmojiController.dispose();
    super.dispose();
  }

  void _applyProfile(_ConservationProfile? profile) {
    setState(() {
      _avgShelfDays = profile?.days;
      _avgShelfDaysFreezer = profile?.freezer;
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    final input = CategoryInput(
      name: _nameController.text.trim(),
      icon: _icon,
      colorHex: _color,
      avgShelfDays: _avgShelfDays,
      avgShelfDaysOpened: _avgShelfDaysOpened,
      avgShelfDaysFreezer: _avgShelfDaysFreezer,
    );
    try {
      final repo = ref.read(inventoryRepositoryProvider);
      final editing = widget.editing;
      if (editing != null) {
        await repo.updateCategory(editing.id, input);
      } else {
        await repo.createCategory(input);
      }
      _invalidateCategoryData(ref);
      if (!mounted) return;
      Navigator.of(context).pop();
      messenger.showSnackBar(
        SnackBar(
          content: Text(_isEditing ? 'Catégorie modifiée' : 'Catégorie créée'),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      messenger.showSnackBar(
        const SnackBar(
            content:
                Text('Échec de l\'enregistrement. Vérifie ta connexion.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedProfile = _matchProfile(_avgShelfDays, _avgShelfDaysFreezer);
    final color = parseHexColor(_color) ?? AppColors.primary;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  _isEditing ? 'Modifier la catégorie' : 'Créer une catégorie',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      TextFormField(
                        controller: _nameController,
                        textCapitalization: TextCapitalization.sentences,
                        autofocus: !_isEditing,
                        decoration: const InputDecoration(
                          labelText: 'Nom *',
                          hintText: 'Ex. Apéritif',
                          prefixIcon: Icon(Icons.label_outline),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Le nom est obligatoire'
                            : null,
                      ),
                      const SizedBox(height: 18),
                      // Aperçu
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              alignment: Alignment.center,
                              child: Text(_icon,
                                  style: const TextStyle(fontSize: 20)),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              _nameController.text.trim().isEmpty
                                  ? 'Nom de la catégorie'
                                  : _nameController.text.trim(),
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                      const FieldLabel('Emoji'),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final e in _emojiPresets)
                            IconChoice(
                              icon: e,
                              selected: _icon == e,
                              onTap: () => setState(() {
                                _icon = e;
                                _customEmojiController.clear();
                              }),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _customEmojiController,
                        decoration: const InputDecoration(
                          isDense: true,
                          hintText: 'Ou colle un autre emoji ici',
                        ),
                        onChanged: (v) {
                          final chars = v.characters;
                          if (chars.isNotEmpty) {
                            setState(() => _icon = chars.first);
                          }
                        },
                      ),
                      const SizedBox(height: 18),
                      const FieldLabel('Couleur'),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          for (final c in _categoryColorPresets)
                            ColorChoice(
                              hex: c,
                              selected: _color.toLowerCase() == c.toLowerCase(),
                              onTap: () => setState(() => _color = c),
                            ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      const FieldLabel('Type de conservation'),
                      const SizedBox(height: 4),
                      const Text(
                        'Sert à estimer automatiquement la date de péremption '
                        'des produits de cette catégorie.',
                        style: TextStyle(
                            fontSize: 12, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          for (final p in _conservationProfiles) ...[
                            Expanded(
                              child: _ProfileButton(
                                profile: p,
                                selected: selectedProfile?.key == p.key,
                                onTap: () => _applyProfile(p),
                              ),
                            ),
                            if (p != _conservationProfiles.last)
                              const SizedBox(width: 8),
                          ],
                        ],
                      ),
                      const SizedBox(height: 10),
                      if (selectedProfile != null)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            selectedProfile.description,
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textSecondary),
                          ),
                        )
                      else
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                _avgShelfDays == null &&
                                        _avgShelfDaysFreezer == null
                                    ? 'Aucune estimation automatique.'
                                    : 'Durées personnalisées.',
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary),
                              ),
                            ),
                            if (_avgShelfDays != null ||
                                _avgShelfDaysFreezer != null)
                              TextButton(
                                onPressed: () => _applyProfile(null),
                                child: const Text('Retirer'),
                              ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(
                  20, 8, 20, 16 + MediaQuery.of(context).padding.bottom),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _saving ? null : _submit,
                  icon: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : Icon(_isEditing ? Icons.save_outlined : Icons.check),
                  label: Text(_isEditing ? 'Enregistrer' : 'Créer'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileButton extends StatelessWidget {
  const _ProfileButton({
    required this.profile,
    required this.selected,
    required this.onTap,
  });

  final _ConservationProfile profile;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryLight : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Text(profile.icon, style: const TextStyle(fontSize: 20)),
            const SizedBox(height: 4),
            Text(
              profile.label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? AppColors.primaryDark : AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
