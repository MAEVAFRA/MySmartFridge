import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

/// Libellés des types d'emplacement (alignés sur le web).
const _locationTypes = <({String value, String label})>[
  (value: 'fridge', label: 'Réfrigérateur'),
  (value: 'freezer', label: 'Congélateur'),
  (value: 'pantry', label: 'Placard'),
  (value: 'cellar', label: 'Cave'),
  (value: 'other', label: 'Autre'),
];

const _iconPresets = ['🧊', '❄️', '🗄️', '🍷', '📦', '🧺', '🥫', '🧂', '🍽️', '🚪'];
const _colorPresets = [
  '#3b82f6',
  '#06b6d4',
  '#8b5cf6',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#ec4899',
  '#6366f1',
];

/// Libellé lisible d'un type d'emplacement (`fridge` → « Réfrigérateur »…).
String locationTypeLabel(String type) =>
    _locationTypes.where((t) => t.value == type).map((t) => t.label).firstOrNull ??
    'Autre';

/// Écran de gestion des emplacements (INV-12) : liste avec comptage produits,
/// création / édition / suppression.
class LocationsScreen extends ConsumerWidget {
  const LocationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(locationsAdminProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Emplacements',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => showLocationFormSheet(context, ref),
        tooltip: 'Ajouter un emplacement',
        child: const Icon(Icons.add),
      ),
      body: async.when(
        loading: () => const LoadingView(),
        error: (_, _) => ErrorRetryView(
          title: 'Impossible de charger les emplacements',
          onRetry: () => ref.invalidate(locationsAdminProvider),
        ),
        data: (data) {
          if (data.locations.isEmpty) {
            return RefreshIndicator(
              onRefresh: () => _refresh(ref),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.18),
                  const EmptyView(
                    icon: Icons.place_outlined,
                    title: 'Aucun emplacement',
                    message: 'Crée ton premier emplacement pour ranger tes '
                        'produits.',
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: FilledButton.icon(
                      onPressed: () => showLocationFormSheet(context, ref),
                      icon: const Icon(Icons.add),
                      label: const Text('Ajouter un emplacement'),
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
              itemCount: data.locations.length,
              itemBuilder: (_, i) {
                final loc = data.locations[i];
                return _LocationCard(
                  location: loc,
                  count: data.countFor(loc.id),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(locationsAdminProvider);
    await ref.read(locationsAdminProvider.future);
  }
}

class _LocationCard extends ConsumerWidget {
  const _LocationCard({required this.location, required this.count});

  final Location location;
  final int count;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = locationColor(location);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => context.push('/locations/${location.id}', extra: location),
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
                  child: location.icon != null
                      ? Text(location.icon!,
                          style: const TextStyle(fontSize: 22))
                      : Icon(Icons.place_outlined, color: color),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              location.name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ),
                          if (location.isDefault) ...[
                            const SizedBox(width: 6),
                            const _DefaultBadge(),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        [
                          locationTypeLabel(location.type),
                          if (location.temperatureCelsius != null)
                            '${location.temperatureCelsius}°C',
                          '$count produit${count > 1 ? 's' : ''}',
                        ].join(' • '),
                        style: const TextStyle(
                            fontSize: 12.5, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                _LocationMenu(location: location, count: count),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DefaultBadge extends StatelessWidget {
  const _DefaultBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Text(
        'Par défaut',
        style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: AppColors.primaryDark),
      ),
    );
  }
}

/// Menu Modifier / Supprimer d'un emplacement.
class _LocationMenu extends ConsumerWidget {
  const _LocationMenu({required this.location, required this.count});

  final Location location;
  final int count;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PopupMenuButton<String>(
      icon: const Icon(Icons.more_vert, color: AppColors.textSecondary),
      onSelected: (value) {
        if (value == 'edit') {
          showLocationFormSheet(context, ref, editing: location);
        } else if (value == 'delete') {
          confirmDeleteLocation(context, ref, location, count);
        }
      },
      itemBuilder: (_) => const [
        PopupMenuItem(value: 'edit', child: Text('Modifier')),
        PopupMenuItem(value: 'delete', child: Text('Supprimer')),
      ],
    );
  }
}

/// Confirme la suppression d'un emplacement (les produits sont détachés, pas
/// supprimés) puis l'exécute. Retourne `true` si l'emplacement a été supprimé.
Future<bool> confirmDeleteLocation(
  BuildContext context,
  WidgetRef ref,
  Location location,
  int count,
) async {
  final messenger = ScaffoldMessenger.of(context);
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text('Supprimer « ${location.name} » ?'),
      content: Text(
        count > 0
            ? '$count produit${count > 1 ? 's seront détachés' : ' sera détaché'} '
                'de cet emplacement (ils ne seront pas supprimés).'
            : 'Cet emplacement sera définitivement supprimé.',
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
    await ref.read(inventoryRepositoryProvider).deleteLocation(location.id);
    _invalidateLocationData(ref);
    messenger.showSnackBar(
      SnackBar(content: Text('« ${location.name} » supprimé')),
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

/// Invalide tous les providers dépendant des emplacements après une écriture.
void _invalidateLocationData(WidgetRef ref) {
  ref.invalidate(locationsAdminProvider);
  ref.invalidate(locationsProvider);
  ref.invalidate(inventoryProvider);
  ref.invalidate(dashboardProvider);
  ref.invalidate(addProductFormDataProvider);
}

/// Ouvre le formulaire de création / édition d'un emplacement.
Future<void> showLocationFormSheet(
  BuildContext context,
  WidgetRef ref, {
  Location? editing,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _LocationFormSheet(editing: editing),
  );
}

class _LocationFormSheet extends ConsumerStatefulWidget {
  const _LocationFormSheet({this.editing});

  final Location? editing;

  @override
  ConsumerState<_LocationFormSheet> createState() => _LocationFormSheetState();
}

class _LocationFormSheetState extends ConsumerState<_LocationFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _nameController =
      TextEditingController(text: widget.editing?.name ?? '');
  late final _tempController = TextEditingController(
      text: widget.editing?.temperatureCelsius?.toString() ?? '');

  late String _type = widget.editing?.type ?? 'other';
  late String _icon = widget.editing?.icon ?? '🗄️';
  late String _color = widget.editing?.colorHex ?? '#6366f1';
  bool _saving = false;

  bool get _isEditing => widget.editing != null;

  @override
  void dispose() {
    _nameController.dispose();
    _tempController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    final input = LocationInput(
      name: _nameController.text.trim(),
      type: _type,
      icon: _icon,
      colorHex: _color,
      temperatureCelsius:
          num.tryParse(_tempController.text.trim().replaceAll(',', '.')),
    );
    try {
      final repo = ref.read(inventoryRepositoryProvider);
      final editing = widget.editing;
      if (editing != null) {
        await repo.updateLocation(editing.id, input);
      } else {
        await repo.createLocation(input);
      }
      _invalidateLocationData(ref);
      if (!mounted) return;
      Navigator.of(context).pop();
      messenger.showSnackBar(
        SnackBar(
          content: Text(
              _isEditing ? 'Emplacement modifié' : 'Emplacement créé'),
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
                  _isEditing
                      ? 'Modifier l\'emplacement'
                      : 'Ajouter un emplacement',
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
                          hintText: 'Ex. Placard épices',
                          prefixIcon: Icon(Icons.label_outline),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Le nom est obligatoire'
                            : null,
                      ),
                      const SizedBox(height: 14),
                      DropdownButtonFormField<String>(
                        initialValue: _type,
                        decoration: const InputDecoration(
                          labelText: 'Type',
                          prefixIcon: Icon(Icons.category_outlined),
                        ),
                        items: [
                          for (final t in _locationTypes)
                            DropdownMenuItem(
                                value: t.value, child: Text(t.label)),
                        ],
                        onChanged: (v) => setState(() => _type = v ?? _type),
                      ),
                      const SizedBox(height: 18),
                      const FieldLabel('Icône'),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final ic in _iconPresets)
                            IconChoice(
                              icon: ic,
                              selected: _icon == ic,
                              onTap: () => setState(() => _icon = ic),
                            ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      const FieldLabel('Couleur'),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          for (final c in _colorPresets)
                            ColorChoice(
                              hex: c,
                              selected: _color.toLowerCase() == c.toLowerCase(),
                              onTap: () => setState(() => _color = c),
                            ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      TextFormField(
                        controller: _tempController,
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true, signed: true),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(
                              RegExp(r'[0-9.,-]')),
                        ],
                        decoration: const InputDecoration(
                          labelText: 'Température (°C) — optionnel',
                          hintText: 'Ex. 4',
                          prefixIcon: Icon(Icons.thermostat_outlined),
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return null;
                          return num.tryParse(
                                      v.trim().replaceAll(',', '.')) ==
                                  null
                              ? 'Nombre invalide'
                              : null;
                        },
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
                  label: Text(_isEditing ? 'Enregistrer' : 'Ajouter'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

