import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/async_state_views.dart';
import '../application/shopping_providers.dart';
import '../data/shopping_repository.dart';
import '../domain/shopping_models.dart';
import 'add_from_inventory_sheet.dart';
import 'transfer_to_stock_sheet.dart';

/// Onglet Courses : listes du foyer, articles cochables en magasin.
///
/// `Stateful` pour piloter la synchronisation des cochages hors ligne (SHOP-8) :
/// on rejoue la file à la reprise de l'app et périodiquement tant que l'écran
/// est visible.
class ShoppingScreen extends ConsumerStatefulWidget {
  const ShoppingScreen({super.key});

  @override
  ConsumerState<ShoppingScreen> createState() => _ShoppingScreenState();
}

class _ShoppingScreenState extends ConsumerState<ShoppingScreen>
    with WidgetsBindingObserver {
  Timer? _syncTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Tente d'écouler la file au montage (ex. cochages hors ligne d'une session
    // précédente) puis à intervalle régulier tant que l'écran vit.
    WidgetsBinding.instance.addPostFrameCallback((_) => _flush());
    _syncTimer =
        Timer.periodic(const Duration(seconds: 20), (_) => _flush());
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Au retour au premier plan, on retente la synchronisation (le réseau a pu
    // revenir pendant que l'app était en arrière-plan).
    if (state == AppLifecycleState.resumed) _flush();
  }

  void _flush() {
    if (!mounted) return;
    ref.read(shoppingActionsProvider).flushPending();
  }

  @override
  Widget build(BuildContext context) {
    final lists = ref.watch(shoppingListsProvider);

    // Liste active pour le menu (renommer/supprimer) : seulement si on a des données.
    final activeForMenu = lists.maybeWhen(
      data: (d) => d.isEmpty
          ? null
          : _activeList(d, ref.watch(selectedListIdProvider)),
      orElse: () => null,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Courses',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            tooltip: 'Nouvelle liste',
            icon: const Icon(Icons.add),
            onPressed: () => _createListDialog(context, ref),
          ),
          if (activeForMenu != null)
            PopupMenuButton<_ListAction>(
              tooltip: 'Options de la liste',
              onSelected: (action) => switch (action) {
                _ListAction.rename =>
                  _renameListDialog(context, ref, activeForMenu),
                _ListAction.delete =>
                  _deleteListDialog(context, ref, activeForMenu),
              },
              itemBuilder: (_) => const [
                PopupMenuItem(
                  value: _ListAction.rename,
                  child: ListTile(
                    leading: Icon(Icons.edit_outlined),
                    title: Text('Renommer la liste'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                PopupMenuItem(
                  value: _ListAction.delete,
                  child: ListTile(
                    leading: Icon(Icons.delete_outline, color: AppColors.error),
                    title: Text('Supprimer la liste',
                        style: TextStyle(color: AppColors.error)),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
        ],
      ),
      body: lists.when(
        loading: () => const LoadingView(),
        error: (_, _) => ErrorRetryView(
          title: 'Impossible de charger tes listes',
          onRetry: () => ref.invalidate(shoppingListsProvider),
        ),
        data: (data) {
          if (data.isEmpty) {
            return RefreshIndicator(
              onRefresh: () => _refresh(ref),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.2),
                  const EmptyView(
                    icon: Icons.shopping_cart_outlined,
                    title: 'Aucune liste de courses',
                    message: 'Crée ta première liste pour commencer.',
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: FilledButton.icon(
                      onPressed: () => _createListDialog(context, ref),
                      icon: const Icon(Icons.add),
                      label: const Text('Créer une liste'),
                    ),
                  ),
                ],
              ),
            );
          }

          final active = _activeList(data, ref.watch(selectedListIdProvider));
          return Column(
            children: [
              _ListSelector(lists: data, activeId: active.id),
              const _PendingSyncBanner(),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () => _refresh(ref),
                  child: _ListContent(list: active),
                ),
              ),
              _BottomBar(list: active),
            ],
          );
        },
      ),
    );
  }

  /// Rejoue d'abord les cochages en attente, puis recharge les listes.
  Future<void> _refresh(WidgetRef ref) async {
    await ref.read(shoppingActionsProvider).flushPending();
    ref.invalidate(shoppingListsProvider);
    await ref.read(shoppingListsProvider.future);
  }

  /// La liste active : celle sélectionnée si elle existe encore, sinon la liste
  /// par défaut, sinon la première.
  ShoppingList _activeList(List<ShoppingList> lists, String? selectedId) {
    if (selectedId != null) {
      for (final l in lists) {
        if (l.id == selectedId) return l;
      }
    }
    return lists.firstWhere((l) => l.isDefault, orElse: () => lists.first);
  }
}

/// Sélecteur horizontal des listes (puce par liste + compteur d'articles).
class _ListSelector extends ConsumerWidget {
  const _ListSelector({required this.lists, required this.activeId});

  final List<ShoppingList> lists;
  final String activeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        child: Row(
          children: [
            for (final list in lists) ...[
              ChoiceChip(
                label: Text('${list.name}  ·  ${list.totalCount}'),
                selected: list.id == activeId,
                onSelected: (_) =>
                    ref.read(selectedListIdProvider.notifier).select(list.id),
                selectedColor: AppColors.primaryLight,
                labelStyle: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: list.id == activeId
                      ? AppColors.primaryDark
                      : AppColors.textPrimary,
                ),
                side: BorderSide(
                  color: list.id == activeId
                      ? AppColors.primary
                      : AppColors.border,
                ),
                backgroundColor: AppColors.surface,
              ),
              const SizedBox(width: 8),
            ],
          ],
        ),
      ),
    );
  }
}

/// Bandeau de synchronisation (SHOP-8) : visible tant que des cochages faits hors
/// ligne restent à confirmer. Bouton « Synchroniser » pour forcer un rejeu.
class _PendingSyncBanner extends ConsumerWidget {
  const _PendingSyncBanner();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingCount = ref.watch(pendingChecksProvider).length;
    if (pendingCount == 0) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      color: const Color(0xFFFEF3C7), // amber-100
      padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
      child: Row(
        children: [
          const Icon(Icons.cloud_off_outlined,
              size: 18, color: Color(0xFFB45309)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '$pendingCount modification${pendingCount > 1 ? 's' : ''} '
              'en attente de synchronisation',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFFB45309), // amber-700
              ),
            ),
          ),
          TextButton(
            onPressed: () => ref.read(shoppingActionsProvider).flushPending(),
            child: const Text('Synchroniser'),
          ),
        ],
      ),
    );
  }
}

/// Contenu d'une liste : compteur de progression + articles à acheter / cochés.
class _ListContent extends ConsumerWidget {
  const _ListContent({required this.list});

  final ShoppingList list;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (list.items.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.12),
          const EmptyView(
            icon: Icons.add_shopping_cart,
            title: 'Liste vide',
            message: 'Ajoute des articles à acheter, ou importe ton stock.',
          ),
        ],
      );
    }

    // État coché effectif = surcharge optimiste/hors-ligne si présente, sinon
    // valeur serveur.
    final pending = ref.watch(pendingChecksProvider);
    bool isChecked(ShoppingItem i) => pending[i.id]?.checked ?? i.checked;

    final toBuy = list.items.where((i) => !isChecked(i)).toList();
    final inCart = list.items.where(isChecked).toList();
    final checkedCount = inCart.length;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        _ProgressHeader(checked: checkedCount, total: list.totalCount),
        const SizedBox(height: 16),
        if (toBuy.isNotEmpty) ...[
          _SectionLabel('À acheter (${toBuy.length})'),
          const SizedBox(height: 8),
          _ItemsCard(items: toBuy, listId: list.id, checked: false),
        ],
        if (inCart.isNotEmpty) ...[
          const SizedBox(height: 20),
          _SectionLabel('Dans le panier (${inCart.length})'),
          const SizedBox(height: 8),
          _ItemsCard(items: inCart, listId: list.id, checked: true),
        ],
      ],
    );
  }
}

class _ProgressHeader extends StatelessWidget {
  const _ProgressHeader({required this.checked, required this.total});

  final int checked;
  final int total;

  @override
  Widget build(BuildContext context) {
    final ratio = total == 0 ? 0.0 : checked / total;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.shopping_cart_outlined,
                size: 18, color: AppColors.textSecondary),
            const SizedBox(width: 8),
            Text(
              '$checked / $total coché${checked > 1 ? 's' : ''}',
              style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: ratio,
            minHeight: 8,
            backgroundColor: AppColors.border,
            valueColor: const AlwaysStoppedAnimation(AppColors.success),
          ),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.bold,
        color: AppColors.textSecondary,
        letterSpacing: 0.3,
      ),
    );
  }
}

class _ItemsCard extends StatelessWidget {
  const _ItemsCard({
    required this.items,
    required this.listId,
    required this.checked,
  });

  final List<ShoppingItem> items;
  final String listId;
  final bool checked;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0)
              const Divider(
                  height: 1,
                  indent: 16,
                  endIndent: 16,
                  color: AppColors.border),
            _ItemRow(item: items[i], listId: listId, checked: checked),
          ],
        ],
      ),
    );
  }
}

class _ItemRow extends ConsumerWidget {
  const _ItemRow({
    required this.item,
    required this.listId,
    required this.checked,
  });

  final ShoppingItem item;
  final String listId;

  /// État coché effectif (surcharge optimiste appliquée en amont).
  final bool checked;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final qty = _formatQuantity(item);
    return Dismissible(
      key: ValueKey('item-${item.id}'),
      direction: DismissDirection.endToStart,
      background: Container(
        color: AppColors.error,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      onDismissed: (_) {
        final messenger = ScaffoldMessenger.of(context);
        ref.read(shoppingActionsProvider).deleteItem(listId, item.id).then((ok) {
          messenger.showSnackBar(
            SnackBar(
              content: Text(ok
                  ? '« ${item.name} » supprimé'
                  : 'Impossible de supprimer l\'article'),
              backgroundColor: ok ? null : AppColors.error,
            ),
          );
        });
      },
      child: InkWell(
        onTap: () {
          final messenger = ScaffoldMessenger.of(context);
          HapticFeedback.selectionClick();
          ref
              .read(shoppingActionsProvider)
              .toggleChecked(listId, item, checked)
              .then((result) => _handleToggleResult(messenger, result));
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Icon(
                checked ? Icons.check_circle : Icons.radio_button_unchecked,
                color: checked ? AppColors.success : AppColors.neutral400,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        item.name,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: checked
                              ? AppColors.textSecondary
                              : AppColors.textPrimary,
                          decoration:
                              checked ? TextDecoration.lineThrough : null,
                        ),
                      ),
                    ),
                    if (item.productId != null) ...[
                      const SizedBox(width: 6),
                      Icon(Icons.inventory_2_outlined,
                          size: 14,
                          color: AppColors.neutral400,
                          semanticLabel: 'Depuis le stock'),
                    ],
                  ],
                ),
              ),
              if (qty != null)
                Text(
                  qty,
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textSecondary),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// Retour utilisateur après un cochage : silencieux si synchronisé, information
  /// discrète si mis en file hors ligne, erreur si échec serveur réel.
  void _handleToggleResult(
      ScaffoldMessengerState messenger, ToggleResult result) {
    switch (result) {
      case ToggleResult.synced:
        break;
      case ToggleResult.queuedOffline:
        messenger
          ..removeCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(
              content: Text('Hors ligne — modification enregistrée, '
                  'synchronisation automatique.'),
              duration: Duration(seconds: 2),
            ),
          );
      case ToggleResult.failed:
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Échec de la synchronisation'),
            backgroundColor: AppColors.error,
          ),
        );
    }
  }
}

/// Bas d'écran : barre de transfert contextuelle (SHOP-7) + barre d'ajout.
class _BottomBar extends ConsumerWidget {
  const _BottomBar({required this.list});

  final ShoppingList list;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pending = ref.watch(pendingChecksProvider);
    bool isChecked(ShoppingItem i) => pending[i.id]?.checked ?? i.checked;
    final checkedCount = list.items.where(isChecked).length;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (checkedCount > 0)
          _TransferBar(listId: list.id, count: checkedCount),
        _AddItemBar(list: list),
      ],
    );
  }
}

/// Barre verte « Transférer N en stock », visible dès qu'un article est coché.
class _TransferBar extends StatelessWidget {
  const _TransferBar({required this.listId, required this.count});

  final String listId;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      child: InkWell(
        onTap: () => showTransferToStockSheet(
          context,
          listId: listId,
          checkedCount: count,
        ),
        child: Container(
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
          child: Row(
            children: [
              const Icon(Icons.move_to_inbox_outlined,
                  size: 20, color: AppColors.success),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Transférer $count article${count > 1 ? 's' : ''} en stock',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.success,
                  ),
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.success),
            ],
          ),
        ),
      ),
    );
  }
}

/// Barre de saisie d'un nouvel article + import depuis le stock, ancrée en bas.
class _AddItemBar extends ConsumerStatefulWidget {
  const _AddItemBar({required this.list});

  final ShoppingList list;

  @override
  ConsumerState<_AddItemBar> createState() => _AddItemBarState();
}

class _AddItemBarState extends ConsumerState<_AddItemBar> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  bool _submitting = false;

  String get _listId => widget.list.id;

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _controller.text.trim();
    if (name.isEmpty || _submitting) return;
    setState(() => _submitting = true);
    try {
      await ref
          .read(shoppingRepositoryProvider)
          .addItem(_listId, name: name);
      _controller.clear();
      ref.invalidate(shoppingListsProvider);
      // Garde le focus pour enchaîner les saisies en magasin.
      _focus.requestFocus();
    } catch (_) {
      if (mounted) _showError(context, 'Impossible d\'ajouter l\'article');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _openFromInventory() {
    final existing = widget.list.items
        .where((i) => i.productId != null)
        .map((i) => i.productId!)
        .toSet();
    showAddFromInventorySheet(
      context,
      listId: _listId,
      existingProductIds: existing,
      listName: widget.list.name,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: EdgeInsets.fromLTRB(
        8,
        8,
        12,
        8 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            IconButton(
              tooltip: 'Ajouter depuis le stock',
              onPressed: _openFromInventory,
              icon: const Icon(Icons.inventory_2_outlined),
              color: AppColors.primaryDark,
            ),
            Expanded(
              child: TextField(
                controller: _controller,
                focusNode: _focus,
                textCapitalization: TextCapitalization.sentences,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  isDense: true,
                  hintText: 'Ajouter un article…',
                  filled: true,
                  fillColor: AppColors.background,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              style: FilledButton.styleFrom(
                shape: const CircleBorder(),
                padding: const EdgeInsets.all(14),
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.add),
            ),
          ],
        ),
      ),
    );
  }
}

enum _ListAction { rename, delete }

// ─── Actions sur les listes (SHOP-3) : dialogs natifs ───────────────

Future<void> _createListDialog(BuildContext context, WidgetRef ref) async {
  final name = await _promptListName(context, title: 'Nouvelle liste');
  if (name == null || !context.mounted) return;
  try {
    final created = await ref.read(shoppingRepositoryProvider).createList(name);
    ref.read(selectedListIdProvider.notifier).select(created.id);
    ref.invalidate(shoppingListsProvider);
  } catch (_) {
    if (context.mounted) _showError(context, 'Impossible de créer la liste');
  }
}

Future<void> _renameListDialog(
    BuildContext context, WidgetRef ref, ShoppingList list) async {
  final name = await _promptListName(context,
      title: 'Renommer la liste', initial: list.name);
  if (name == null || name == list.name || !context.mounted) return;
  try {
    await ref.read(shoppingRepositoryProvider).renameList(list.id, name);
    ref.invalidate(shoppingListsProvider);
  } catch (_) {
    if (context.mounted) _showError(context, 'Impossible de renommer la liste');
  }
}

Future<void> _deleteListDialog(
    BuildContext context, WidgetRef ref, ShoppingList list) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Supprimer la liste ?'),
      content: Text(
          '« ${list.name} » et ses ${list.totalCount} article(s) seront supprimés.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('Annuler'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.error),
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Supprimer'),
        ),
      ],
    ),
  );
  if (confirmed != true || !context.mounted) return;
  try {
    await ref.read(shoppingRepositoryProvider).deleteList(list.id);
    ref.read(selectedListIdProvider.notifier).reset();
    ref.invalidate(shoppingListsProvider);
  } catch (_) {
    if (context.mounted) _showError(context, 'Impossible de supprimer la liste');
  }
}

/// Petit formulaire de saisie de nom (création / renommage).
Future<String?> _promptListName(BuildContext context,
    {required String title, String initial = ''}) {
  final controller = TextEditingController(text: initial);
  return showDialog<String>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: TextField(
        controller: controller,
        autofocus: true,
        textCapitalization: TextCapitalization.sentences,
        decoration: const InputDecoration(
          labelText: 'Nom de la liste',
          hintText: 'Ex. Courses de la semaine',
        ),
        onSubmitted: (v) => Navigator.pop(ctx, v.trim()),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(ctx, controller.text.trim()),
          child: const Text('Valider'),
        ),
      ],
    ),
  ).then((v) => (v == null || v.isEmpty) ? null : v);
}

void _showError(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message), backgroundColor: AppColors.error),
  );
}

/// Quantité formatée (« 2 unité », « 500 g »…) ou `null`.
String? _formatQuantity(ShoppingItem item) {
  final quantity = item.quantity;
  if (quantity == null) return null;
  final value =
      quantity % 1 == 0 ? quantity.toInt().toString() : quantity.toString();
  final unit = item.unit;
  return (unit != null && unit.isNotEmpty) ? '$value $unit' : value;
}
