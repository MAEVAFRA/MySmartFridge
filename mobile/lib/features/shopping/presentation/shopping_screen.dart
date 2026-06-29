import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/async_state_views.dart';
import '../application/shopping_providers.dart';
import '../data/shopping_repository.dart';
import '../domain/shopping_models.dart';

/// Liste de courses active sélectionnée par l'utilisateur (`null` → liste par
/// défaut / première liste).
class SelectedListId extends Notifier<String?> {
  @override
  String? build() => null;

  void select(String id) => state = id;

  /// Revient à la sélection par défaut (liste par défaut / première).
  void reset() => state = null;
}

final selectedListIdProvider =
    NotifierProvider<SelectedListId, String?>(SelectedListId.new);

/// Surcharges optimistes de l'état « coché » par article (id → coché), le temps
/// que l'appel réseau confirme. Permet un cochage instantané en magasin (SHOP-5).
class CheckOverrides extends Notifier<Map<String, bool>> {
  @override
  Map<String, bool> build() => const {};

  void set(String itemId, bool checked) =>
      state = {...state, itemId: checked};

  void clear(String itemId) {
    if (!state.containsKey(itemId)) return;
    final next = {...state}..remove(itemId);
    state = next;
  }
}

final checkOverridesProvider =
    NotifierProvider<CheckOverrides, Map<String, bool>>(CheckOverrides.new);

/// Onglet Courses : listes du foyer, articles cochables en magasin.
class ShoppingScreen extends ConsumerWidget {
  const ShoppingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () => _refresh(ref),
                  child: _ListContent(list: active),
                ),
              ),
              _AddItemBar(listId: active.id),
            ],
          );
        },
      ),
    );
  }

  Future<void> _refresh(WidgetRef ref) async {
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
          SizedBox(height: MediaQuery.of(context).size.height * 0.15),
          const EmptyView(
            icon: Icons.add_shopping_cart,
            title: 'Liste vide',
            message: 'Ajoute des articles à acheter.',
          ),
        ],
      );
    }

    // État coché effectif = surcharge optimiste si présente, sinon serveur.
    final overrides = ref.watch(checkOverridesProvider);
    bool isChecked(ShoppingItem i) => overrides[i.id] ?? i.checked;

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
      onDismissed: (_) => _deleteItem(context, ref, listId, item),
      child: InkWell(
        onTap: () => _toggleItem(context, ref, listId, item, checked),
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
                child: Text(
                  item.name,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: checked
                        ? AppColors.textSecondary
                        : AppColors.textPrimary,
                    decoration: checked ? TextDecoration.lineThrough : null,
                  ),
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
}

/// Coche/décoche un article : retour haptique + mise à jour optimiste, puis
/// confirmation serveur. En cas d'échec, on resynchronise sur le serveur (SHOP-5).
Future<void> _toggleItem(BuildContext context, WidgetRef ref, String listId,
    ShoppingItem item, bool current) async {
  final next = !current;
  HapticFeedback.selectionClick();

  final overrides = ref.read(checkOverridesProvider.notifier);
  final messenger = ScaffoldMessenger.of(context);
  overrides.set(item.id, next);
  try {
    await ref
        .read(shoppingRepositoryProvider)
        .setItemChecked(listId, item.id, next);
    ref.invalidate(shoppingListsProvider);
    await ref.read(shoppingListsProvider.future);
  } catch (_) {
    messenger.showSnackBar(
      const SnackBar(
        content: Text('Échec de la synchronisation'),
        backgroundColor: AppColors.error,
      ),
    );
    ref.invalidate(shoppingListsProvider);
  } finally {
    overrides.clear(item.id);
  }
}

/// Barre de saisie d'un nouvel article, ancrée en bas de l'écran.
class _AddItemBar extends ConsumerStatefulWidget {
  const _AddItemBar({required this.listId});

  final String listId;

  @override
  ConsumerState<_AddItemBar> createState() => _AddItemBarState();
}

class _AddItemBarState extends ConsumerState<_AddItemBar> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  bool _submitting = false;

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
          .addItem(widget.listId, name: name);
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

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: EdgeInsets.fromLTRB(
        12,
        8,
        12,
        8 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
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

Future<void> _deleteItem(BuildContext context, WidgetRef ref, String listId,
    ShoppingItem item) async {
  try {
    await ref.read(shoppingRepositoryProvider).deleteItem(listId, item.id);
    ref.invalidate(shoppingListsProvider);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('« ${item.name} » supprimé')),
      );
    }
  } catch (_) {
    if (context.mounted) _showError(context, 'Impossible de supprimer l\'article');
    ref.invalidate(shoppingListsProvider); // resynchronise l'affichage
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
