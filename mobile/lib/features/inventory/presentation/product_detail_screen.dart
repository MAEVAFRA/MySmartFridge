import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/expiry.dart';
import '../../../core/widgets/async_state_views.dart';
import '../../home/dashboard_provider.dart';
import '../application/inventory_providers.dart';
import '../data/inventory_repository.dart';
import '../domain/inventory_models.dart';
import 'add_product_sheet.dart';
import 'location_style.dart';
import 'product_image.dart';

/// Fiche détaillée d'un produit (INV-5).
///
/// La liste passe le produit déjà chargé via `extra` pour un affichage
/// instantané ; on rafraîchit en arrière-plan depuis `GET /products/:id` pour
/// récupérer les champs complets et toute mise à jour.
class ProductDetailScreen extends ConsumerWidget {
  const ProductDetailScreen({
    super.key,
    required this.productId,
    this.initial,
  });

  final String productId;
  final Product? initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(productDetailProvider(productId));
    final product = async.whenOrNull(data: (p) => p) ?? initial;

    // Aucun produit affichable encore : on s'en remet aux états async.
    if (product == null) {
      return Scaffold(
        appBar: AppBar(),
        body: async.when(
          loading: () => const LoadingView(),
          error: (_, _) => ErrorRetryView(
            title: 'Produit introuvable',
            message: 'Ce produit n\'existe plus ou n\'a pas pu être chargé.',
            onRetry: () => ref.invalidate(productDetailProvider(productId)),
          ),
          data: (p) => _DetailBody(product: p),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(product.name,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Modifier',
            onPressed: () => showEditProductSheet(context, product: product),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: 'Retirer du stock',
            onPressed: () => _confirmRemoveProduct(context, ref, product),
          ),
        ],
        bottom: async.isLoading
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2),
              )
            : null,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(productDetailProvider(productId));
          await ref.read(productDetailProvider(productId).future);
        },
        child: _DetailBody(product: product),
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final date = product.expiresAt;
    final days = date != null ? daysUntilExpiry(date) : null;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _Header(product: product),
        const SizedBox(height: 16),
        if (days != null && date != null) ...[
          _ExpiryCard(date: date, days: days),
          const SizedBox(height: 16),
        ],
        _InfoCard(
          rows: [
            if (_quantityLabel(product) != null)
              _InfoRow(
                icon: Icons.scale_outlined,
                label: 'Quantité',
                value: _quantityLabel(product)!,
              ),
            if (product.locationName != null)
              _InfoRow(
                icon: Icons.place_outlined,
                label: 'Emplacement',
                value: product.locationName!,
                leadingEmoji: product.locationIcon,
                accent: locationColorFrom(
                    product.locationColorHex, product.locationType),
              ),
            if (product.categoryName != null)
              _InfoRow(
                icon: Icons.category_outlined,
                label: 'Catégorie',
                value: product.categoryName!,
                leadingEmoji: product.categoryIcon,
              ),
            if (product.price != null)
              _InfoRow(
                icon: Icons.euro_outlined,
                label: 'Prix',
                value: _formatPrice(product.price!),
              ),
            if (product.barcode != null && product.barcode!.isNotEmpty)
              _InfoRow(
                icon: Icons.qr_code_2_outlined,
                label: 'Code-barres',
                value: product.barcode!,
              ),
            if (product.createdAt != null)
              _InfoRow(
                icon: Icons.event_outlined,
                label: 'Ajouté le',
                value: DateFormat('dd/MM/yyyy').format(product.createdAt!),
              ),
          ],
        ),
        if (product.notes != null && product.notes!.trim().isNotEmpty) ...[
          const SizedBox(height: 16),
          _NotesCard(notes: product.notes!.trim()),
        ],
      ],
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ProductThumb(
          imageUrl: product.imageUrl,
          emoji: product.categoryIcon,
          size: 56,
          radius: 14,
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                product.name,
                style: const TextStyle(
                    fontSize: 20, fontWeight: FontWeight.bold),
              ),
              if (product.brand != null && product.brand!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  product.brand!,
                  style: const TextStyle(
                      fontSize: 14, color: AppColors.textSecondary),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _ExpiryCard extends StatelessWidget {
  const _ExpiryCard({required this.date, required this.days});

  final DateTime date;
  final int days;

  @override
  Widget build(BuildContext context) {
    final color = expiryColor(days);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Icon(
            days < 0 ? Icons.warning_amber_rounded : Icons.schedule,
            color: color,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  expiryLabel(days),
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: color),
                ),
                const SizedBox(height: 2),
                Text(
                  'Périme le ${DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(date)}',
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.rows});

  final List<Widget> rows;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0)
              const Divider(
                  height: 1,
                  indent: 16,
                  endIndent: 16,
                  color: AppColors.border),
            rows[i],
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.leadingEmoji,
    this.accent,
  });

  final IconData icon;
  final String label;
  final String value;
  final String? leadingEmoji;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          Text(
            label,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          const Spacer(),
          if (leadingEmoji != null) ...[
            Text(leadingEmoji!, style: const TextStyle(fontSize: 15)),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: accent ?? AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotesCard extends StatelessWidget {
  const _NotesCard({required this.notes});

  final String notes;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.notes_outlined,
                  size: 18, color: AppColors.textSecondary),
              SizedBox(width: 8),
              Text('Notes',
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppColors.textSecondary)),
            ],
          ),
          const SizedBox(height: 8),
          Text(notes, style: const TextStyle(height: 1.4)),
        ],
      ),
    );
  }
}

/// Quantité formatée (« 4 unité », « 500 g »…) ou `null` si non renseignée.
String? _quantityLabel(Product product) {
  final quantity = product.quantity;
  if (quantity == null) return null;
  final value =
      quantity % 1 == 0 ? quantity.toInt().toString() : quantity.toString();
  final unit = product.unit;
  return (unit != null && unit.isNotEmpty) ? '$value $unit' : value;
}

/// Prix formaté en euros (l'API stocke un nombre).
String _formatPrice(num price) =>
    NumberFormat.currency(locale: 'fr_FR', symbol: '€').format(price);

/// Ouvre le sélecteur de motif de retrait (INV-8) puis, si le produit a bien
/// été retiré, revient à la liste et confirme via une SnackBar.
Future<void> _confirmRemoveProduct(
  BuildContext context,
  WidgetRef ref,
  Product product,
) async {
  // Messenger racine (survit au pop de cette fiche), capturé avant navigation.
  final messenger = ScaffoldMessenger.of(context);
  final outcome = await showModalBottomSheet<String>(
    context: context,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _RemoveProductSheet(product: product),
  );
  if (outcome == null) return; // annulé ou échec (message déjà affiché)
  if (context.mounted) context.pop(); // retour à l'inventaire
  messenger.showSnackBar(SnackBar(content: Text(outcome)));
}

/// Bottom sheet demandant le motif de retrait d'un produit (INV-8).
///
/// Chaque motif alimente les statistiques de gaspillage côté serveur ; « juste
/// le retirer » n'envoie aucun motif. Retourne (via `pop`) le message de succès
/// à afficher, ou `null` si l'utilisateur annule / en cas d'échec.
class _RemoveProductSheet extends ConsumerStatefulWidget {
  const _RemoveProductSheet({required this.product});

  final Product product;

  @override
  ConsumerState<_RemoveProductSheet> createState() =>
      _RemoveProductSheetState();
}

class _RemoveProductSheetState extends ConsumerState<_RemoveProductSheet> {
  bool _busy = false;

  Future<void> _remove(
    ProductRemovalReason? reason,
    String successMessage,
  ) async {
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(inventoryRepositoryProvider)
          .deleteProduct(widget.product.id, reason: reason);
      ref.invalidate(inventoryProvider);
      ref.invalidate(dashboardProvider);
      if (!mounted) return;
      Navigator.of(context).pop(successMessage);
    } catch (_) {
      if (!mounted) return;
      setState(() => _busy = false);
      messenger.showSnackBar(
        const SnackBar(
          content:
              Text('Échec du retrait. Vérifie ta connexion et réessaie.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.product.name;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Retirer « $name »',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            const Text(
              'Pourquoi retires-tu ce produit ? Cela alimente tes statistiques '
              'de gaspillage.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 16),
            _ReasonButton(
              icon: Icons.restaurant_outlined,
              label: 'Je l\'ai consommé',
              color: AppColors.success,
              enabled: !_busy,
              onTap: () =>
                  _remove(ProductRemovalReason.consumed, '« $name » consommé'),
            ),
            const SizedBox(height: 10),
            _ReasonButton(
              icon: Icons.delete_outline,
              label: 'Jeté ou périmé',
              color: AppColors.error,
              enabled: !_busy,
              onTap: () => _remove(
                  ProductRemovalReason.thrown, '« $name » retiré (gaspillage)'),
            ),
            const SizedBox(height: 6),
            TextButton(
              onPressed:
                  _busy ? null : () => _remove(null, '« $name » retiré du stock'),
              child: const Text('Juste le retirer (sans compter)'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Bouton d'un motif de retrait, teinté selon la sémantique du motif.
class _ReasonButton extends StatelessWidget {
  const _ReasonButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.enabled,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: enabled ? onTap : null,
      icon: Icon(icon, size: 20),
      label: Text(label),
      style: FilledButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14),
        alignment: Alignment.centerLeft,
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    );
  }
}
