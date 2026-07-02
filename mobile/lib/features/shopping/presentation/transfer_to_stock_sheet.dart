import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/async_state_views.dart';
import '../../inventory/application/inventory_providers.dart';
import '../../inventory/domain/inventory_models.dart';
import '../../inventory/presentation/location_style.dart';
import '../application/shopping_providers.dart';

/// Ouvre la modale de transfert des articles cochés vers le stock (SHOP-7).
///
/// [checkedCount] est le nombre d'articles qui seront transférés (informatif) ;
/// le backend transfère de toute façon tous les articles cochés côté serveur.
Future<void> showTransferToStockSheet(
  BuildContext context, {
  required String listId,
  required int checkedCount,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) =>
        _TransferSheet(listId: listId, checkedCount: checkedCount),
  );
}

class _TransferSheet extends ConsumerStatefulWidget {
  const _TransferSheet({required this.listId, required this.checkedCount});

  final String listId;
  final int checkedCount;

  @override
  ConsumerState<_TransferSheet> createState() => _TransferSheetState();
}

class _TransferSheetState extends ConsumerState<_TransferSheet> {
  String? _locationId;
  bool _submitting = false;

  /// Présélectionne l'emplacement par défaut (sinon le premier) une seule fois,
  /// à l'arrivée des données.
  void _ensureSelection(List<Location> locations) {
    if (_locationId != null || locations.isEmpty) return;
    final def = locations.firstWhere(
      (l) => l.isDefault,
      orElse: () => locations.first,
    );
    _locationId = def.id;
  }

  Future<void> _submit() async {
    final locationId = _locationId;
    if (locationId == null || _submitting) return;
    setState(() => _submitting = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final result = await ref
          .read(shoppingActionsProvider)
          .transferCheckedToStock(widget.listId, locationId: locationId);
      if (!mounted) return;
      Navigator.of(context).pop();
      final dest = result.location != null ? ' → ${result.location}' : '';
      messenger.showSnackBar(
        SnackBar(
          content: Text(
              '${result.transferred} article${result.transferred > 1 ? 's' : ''} transféré${result.transferred > 1 ? 's' : ''} en stock$dest'),
        ),
      );
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      messenger.showSnackBar(
        SnackBar(
          content: Text(isNetworkError(e)
              ? 'Hors ligne : transfert impossible pour le moment.'
              : 'Échec du transfert. Réessaie.'),
          backgroundColor: AppColors.error,
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Échec du transfert. Réessaie.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final locations = ref.watch(locationsProvider);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
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
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
              child: Row(
                children: [
                  const Icon(Icons.move_to_inbox_outlined,
                      color: AppColors.success),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Transférer en stock',
                      style: TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                    tooltip: 'Fermer',
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '${widget.checkedCount} article${widget.checkedCount > 1 ? 's' : ''} coché${widget.checkedCount > 1 ? 's' : ''} '
                  'seront ajoutés à ton stock puis retirés de la liste.',
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
              ),
            ),
            Flexible(
              child: locations.when(
                loading: () => const SizedBox(height: 200, child: LoadingView()),
                error: (_, _) => SizedBox(
                  height: 200,
                  child: ErrorRetryView(
                    title: 'Impossible de charger les emplacements',
                    onRetry: () => ref.invalidate(locationsProvider),
                  ),
                ),
                data: _buildLocations,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocations(List<Location> locations) {
    if (locations.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: EmptyView(
          icon: Icons.shelves,
          title: 'Aucun emplacement',
          message:
              'Crée un emplacement dans ton inventaire avant de transférer.',
        ),
      );
    }

    _ensureSelection(locations);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Emplacement de destination',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: AppColors.textSecondary,
                letterSpacing: 0.3,
              ),
            ),
          ),
        ),
        Flexible(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: [
              for (final loc in locations)
                _LocationTile(
                  location: loc,
                  selected: loc.id == _locationId,
                  onTap: () => setState(() => _locationId = loc.id),
                ),
            ],
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(
              20, 8, 20, 12 + MediaQuery.of(context).padding.bottom),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: AppColors.success),
              onPressed:
                  (_locationId == null || _submitting) ? null : _submit,
              icon: _submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.move_to_inbox_outlined),
              label: Text(_submitting
                  ? 'Transfert…'
                  : 'Transférer (${widget.checkedCount})'),
            ),
          ),
        ),
      ],
    );
  }
}

class _LocationTile extends StatelessWidget {
  const _LocationTile({
    required this.location,
    required this.selected,
    required this.onTap,
  });

  final Location location;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = locationColor(location);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.primaryLight : AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.border,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Text(
                  location.icon ?? '📦',
                  style: const TextStyle(fontSize: 18),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  location.name,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary),
                ),
              ),
              if (location.isDefault)
                Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Text(
                    'par défaut',
                    style: TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                  ),
                ),
              Icon(
                selected
                    ? Icons.radio_button_checked
                    : Icons.radio_button_unchecked,
                color: selected ? AppColors.primary : AppColors.neutral400,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
