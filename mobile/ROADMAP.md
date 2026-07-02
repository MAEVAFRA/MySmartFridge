# ROADMAP — MySmartFridge Mobile (Flutter)

> Application mobile compagnon de l'API Node/Express et du web React MySmartFridge.
> Objectif : gérer son frigo, ses courses, ses dépenses et son foyer depuis le téléphone, avec scan de produits/tickets en mobilité.
> Soutenance école : **6 juillet 2026** — ce ROADMAP cadre un MVP démontrable et fiable (~12j, périmètre dégraissé) puis un backlog complet vers la parité web.

---

## 1. Vision

Le mobile vise la **parité fonctionnelle progressive** avec le web, en priorisant les usages "en mobilité" (scan code-barre, liste de courses cochable en magasin, alertes péremption). L'API backend est complète et stable : la quasi-totalité du travail mobile consiste à **câbler des endpoints existants** sur des écrans Flutter cohérents avec le Design System.

**Principe directeur Phase 0** : un seul parcours de démonstration, frozen, répété sur le vrai téléphone. Tout ticket hors de ce parcours est explicitement post-soutenance.

---

## 2. État actuel (synthèse de l'audit mobile)

### Socle technique — solide
- ✅ Bootstrap app (`ProviderScope` + `MaterialApp.router`), thème Material3 clair, palette `AppColors`.
- ✅ Config d'environnement via `--dart-define API_BASE_URL` (défaut émulateur `10.0.2.2:3001/api`) — **une seule variable, rien de documenté pour device physique/iOS** (voir ENV-1).
- ✅ Client Dio + injection Riverpod, intercepteur d'injection du JWT (`Authorization: Bearer`).
- ✅ Stockage sécurisé du token (`flutter_secure_storage`).
- ✅ Routage `go_router` piloté par l'état d'auth (3 états, garde cohérente).
- ✅ Coquille à onglets persistants (`StatefulShellRoute.indexedStack`) + barre custom 5 onglets avec FAB Scanner central.
- ✅ Splash + `ComingSoonScreen` réutilisable.

### Fonctionnel — très partiel
- ✅ **Auth** : login, register, forgot-password, restauration de session (`/auth/me`), logout. Complet de bout en bout.
- ✅ **Accueil/Dashboard** : agrégation **côté client par 3 round-trips** (produits, expirants, emplacements), salutation, sections "À consommer vite" + "Mon stock", pull-to-refresh, états async, logout. Complet (lecture seule, items non cliquables). *Note de conception : `GET /stats` existe déjà côté API et pourrait remplacer une partie de cette agrégation maison (voir STAT-1).*
- ✅ **Inventaire (liste)** : écran réel — produits regroupés par emplacement (icône/couleur), badges de péremption, quantité/unité, états chargement/erreur/vide, pull-to-refresh, **recherche (nom/marque) + filtres (emplacement, péremption) + tri (péremption/nom)** (INV-1/INV-2/INV-3/INV-4, UI-1), **fiche détail produit cliquable** (INV-5). Édition encore à faire (INV-7).
- ✅ **Courses** : écran réel — listes du foyer (sélecteur + compteur coché/total), articles sectionnés à acheter/panier, **CRUD listes**, **ajout/suppression d'articles**, **cochage optimiste + haptique** (SHOP-1→5), **ajout depuis l'inventaire** (multi-select + recherche + filtre stock bas, SHOP-6), **transfert des cochés vers le stock** (choix d'emplacement, SHOP-7) et **cochage résilient hors ligne** (file de synchronisation persistée, rejouée au retour réseau, SHOP-8). Epic complète.
- ⬜ **Scanner / Plus** : 2 onglets sur 5 = `ComingSoonScreen` (placeholders).

### Dettes / manques transverses identifiés (vérifiés dans le code)
- ✅ **401 géré globalement** (AUTH-6/TECH-1, livré) : l'intercepteur Dio déconnecte automatiquement sur un 401 d'une requête authentifiée (endpoints d'auth publics exclus) et le routeur renvoie au login. `LogInterceptor` actif en debug (sans logguer le token).
- ✅ **`_loadSession` ne déconnecte plus sur coupure réseau** (AUTH-7, livré) : 401/403 ou token localement expiré → déconnexion ; réseau/timeout/erreur transitoire → session conservée en mode dégradé (identité minimale reconstruite depuis le JWT). Reste à faire : l'intercepteur 401 global (AUTH-6/TECH-1).
- ✅ **Modèle `Product` étendu + écriture** (INV-0) : champs `barcode`/`brand`/`category`/`notes` lus, et `ProductInput.toJson` pour la création (`POST /products`). Reste : `photo` (INV-10).
- ⚠️ **Register** : `RegisterScreen` collecte Prénom + Nom puis les **concatène en un seul champ `name` non réversible** (register_screen.dart l.42-43). PROF-2 héritera de ce champ fusionné — choix à acter (voir AUTH-11).
- ⚠️ **`X-Household-Id` absent côté mobile** alors que le web l'injecte sur chaque requête. Le backend retombe par défaut sur le **premier foyer** (`households` ordonnés par `joined_at`) → un compte **mono-foyer fonctionne déjà de bout en bout sans ce header**. Le `households.first` côté mobile actuel ne sert qu'à afficher le **nom du foyer dans l'AppBar** (cosmétique), il ne scope pas les données.
- ⚠️ Pas de darkTheme/themeMode, pas de retour haptique, accessibilité minimale (barre custom sans `Semantics`).
- ⚠️ Pas de cache/offline, pas de `LogInterceptor`, pas d'`errorBuilder`/route 404.
- ⚠️ Pas de timeout de sécurité sur le splash : si `/auth/me` ou la lecture Keystore bloque, l'app peut rester coincée au démarrage (voir SPLASH-1).
- ⚠️ Coquille à onglets : bouton retour Android non personnalisé (pas de `PopScope`).
- ⚠️ Duplications : regex email + bloc try/catch dans les 3 écrans auth ; couleurs hex en dur dans `home_screen.dart` et `auth_widgets.dart` (hors `AppColors`).
- ⚠️ Couplage `core → features` dans le routeur.
- ⚠️ Aucun test, aucune CI, aucun pipeline de build/distribution (APK).

**Capacités backend disponibles mais non exploitées côté mobile** : products (write/detail/barcode), categories (CRUD + detail), locations (CRUD + detail-avec-produits), shopping-lists (complet), recipes (complet), expenses + budgets, households (complet), stats + export, receipts (scan OCR Tesseract.js côté serveur, FR), auth profile/password/reset, `GET /health`.

---

## 3. Légendes

**Statut** : ✅ fait · 🟠 en cours · ⬜ à faire
**Priorité** : `P-Haute` · `P-Moy` · `P-Basse`
**Taille** : `S` (≤0,5j) · `M` (~1-2j) · `L` (≥3j)

---

## 4. Epics & tickets

> Endpoints notés sans le préfixe `/api`. "Parité web" = la fonctionnalité existe déjà sur le web React.

### Epic A — Auth & session

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| AUTH-1 | Login email/mot de passe | ✅ | P-Haute | M | `POST /auth/login` | — |
| AUTH-2 | Inscription | ✅ | P-Haute | M | `POST /auth/register` | — |
| AUTH-3 | Mot de passe oublié (envoi lien) | ✅ | P-Moy | S | `POST /auth/forgot-password` | — |
| AUTH-4 | Restauration de session au démarrage | ✅ | P-Haute | M | `GET /auth/me` | — |
| AUTH-5 | Logout | ✅ | P-Haute | S | — (clear token local) | — |
| AUTH-7 | **Ne pas déconnecter sur coupure réseau** : dans `_loadSession`, distinguer 401 (logout) de réseau/timeout (garder la session, état dégradé). **Indépendant de AUTH-6.** | ✅ | P-Haute | S | `GET /auth/me` | — |
| AUTH-6 | Gestion 401 globale (logout auto + redirect login) dans l'intercepteur Dio | ✅ | P-Haute | M | intercepteur Dio | TECH-1 |
| AUTH-8 | Factoriser validators (email) + helper submit (3 écrans) | ⬜ | P-Basse | S | — | — |
| AUTH-9 | Reset password via deep link | ⬜ | P-Moy | M | `GET /auth/reset-password/:token`, `POST /auth/reset-password` | DEEP-LINK |
| AUTH-10 | Indicateur de force du mot de passe + autovalidate | ⬜ | P-Basse | S | — | — |
| AUTH-11 | **Acter / corriger le champ `name` fusionné** (prénom+nom non réversible) : soit conserver `name` unique et l'aligner avec PROF-2, soit scinder si l'API l'accepte. Décision à documenter. | ⬜ | P-Moy | S | `POST /auth/register`, `PUT /auth/profile` | — |

*Points d'attention.* AUTH-7 est **découplé** de AUTH-6 (le `catch` de `_loadSession` ne passe pas par l'intercepteur) et a **fort impact démo** : un wifi instable déconnecte l'utilisateur à tort dès le splash. C'est un `S` à risque élevé → candidat #1 Phase 0. AUTH-6/TECH-1 sont **le même travail d'interception 401** (voir TECH-1).
*Vérification à faire.* L'absence de refresh-token côté API est **déduite de l'inventaire des endpoints** (aucun `/auth/refresh`), pas d'une preuve backend directe — à confirmer avant de figer la stratégie "401 = logout" (voir notes de cadrage).

---

### Epic B — Inventaire (produits & emplacements)

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| INV-0 | **Étendre le modèle `Product` + sérialisation** : `ProductInput.toJson`, champs `barcode`/`brand`/`category`/`categoryIcon`/`notes` lus. (`photo` → INV-10.) | ✅ | P-Haute | M | — (modèle) | — |
| INV-1 | Provider d'état liste produits (`FutureProvider`) + états loading/erreur/vide | ✅ | P-Haute | M | `GET /products` | UI-1 |
| INV-2 | Écran Inventaire : liste produits avec badges péremption + icône/couleur emplacement | ✅ | P-Haute | M | `GET /products`, `GET /locations` | INV-1 |
| INV-3 | Recherche + tri + filtres (emplacement, péremption) | ✅ | P-Moy | M | `GET /products` | INV-2 |
| INV-4 | Pull-to-refresh inventaire | ✅ | P-Moy | S | `GET /products` | INV-2 |
| INV-5 | Détail produit (route + écran) | ✅ | P-Moy | M | `GET /products/:id` | INV-2 |
| INV-6 | **Ajout produit** (bottom sheet formulaire, charge catégories + emplacements) | ✅ | P-Haute | L | `POST /products`, `GET /locations`, `GET /categories` | INV-0, INV-2 |
| INV-7 | Édition produit | ⬜ | P-Moy | M | `PUT /products/:id` | INV-6 |
| INV-8 | Retrait/suppression produit avec motif (consommé/jeté/retiré) → stats gaspillage | ✅ | P-Moy | M | `DELETE /products/:id` (body `{reason}`) | INV-5 |
| INV-9 | Estimation auto date péremption (catégorie + type emplacement) | ✅ | P-Basse | M | `GET /categories` | INV-6 |
| INV-10 | Photo produit : choix caméra/galerie (`image_picker`) + **compression/redimensionnement avant upload** | ✅ | P-Basse | M | `POST /products` (dataURL/multipart) | INV-6 |
| INV-11 | Pré-remplissage produit via code-barre (depuis scanner) | ✅ | P-Moy | M | `GET /products/barcode/:code` | INV-6, SCAN-2 |
| INV-12 | Gestion emplacements : liste + CRUD | ✅ | P-Basse | L | `GET/POST/PUT/DELETE /locations` | INV-2 |
| INV-13 | Détail emplacement (produits de l'emplacement, comptage) | ✅ | P-Basse | M | `GET /locations/:id` | INV-12 |
| INV-14 | Gestion catégories : liste + CRUD + durées de conservation | ✅ | P-Basse | L | `GET/POST/PUT/DELETE /categories` | — |
| INV-15 | Détail catégorie | ✅ | P-Basse | S | `GET /categories/:id` | INV-14 |
| INV-16 | Pagination / lazy-load liste produits | ✅ | P-Basse | M | `GET /products` | INV-2 |

*Points d'attention.* **INV-0 est un prérequis explicite, pas implicite** : sans sérialisation, INV-6 est sous-estimé ; INV-6 + INV-0 sur le chemin critique = réalistement **2,5-3j avec finition**. Réutiliser les helpers d'urgence/couleur/péremption déjà écrits dans `home_screen.dart` en les **extrayant en couche partagée** avant toute duplication dans Inventaire/Péremptions.

---

### Epic C — Accueil / Dashboard

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| HOME-1 | Dashboard (comptage par emplacement, expirants top 5, salutation) | ✅ | P-Haute | M | `GET /products`, `GET /products/expiring?days=7`, `GET /locations` | — |
| HOME-2 | Pull-to-refresh + états async | ✅ | P-Moy | S | idem | — |
| HOME-3 | Rendre tuiles produit / lignes emplacement cliquables (→ détail/inventaire) | ✅ | P-Moy | S | — | INV-5, INV-2 |
| HOME-4 | Confirmation logout (dialog natif) — *cosmétique : le logout existe déjà* | ⬜ | P-Basse | S | — | — |
| HOME-5 | Actions rapides (Ajouter produit / Scanner) sur le dashboard | ⬜ | P-Basse | S | — | INV-6, SCAN-1 |
| HOME-6 | Lien "voir tout" expirants → écran Péremptions | ⬜ | P-Basse | S | `GET /products/expiring?days=:n` | EXP-1 |
| HOME-7 | Extraire couleurs hex en dur vers `AppColors` | ⬜ | P-Basse | S | — | DS-1 |
| HOME-8 | Remplacer l'agrégation 3-requêtes par `GET /stats` (dette de conception) | ⬜ | P-Basse | S | `GET /stats` | STAT-1 |

---

### Epic D — Péremptions (vue dédiée)

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| EXP-1 | Écran Péremptions : périmés + à venir, sélecteur fenêtre (3/7/14/30j) | ✅ | P-Moy | M | `GET /products/expiring?days=:n` | INV-1 |
| EXP-2 | Libellés relatifs + code couleur urgence (réutiliser helpers) | ✅ | P-Moy | S | — | EXP-1 |

*Parité web : page `/expiring`.*

---

### Epic E — Listes de courses

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| SHOP-1 | Couche data+modèles (ShoppingList, ShoppingItem) + provider | ✅ | P-Haute | M | `GET /shopping-lists` | UI-1 |
| SHOP-2 | Écran listes (onglets, compteur coché/total) + états | ✅ | P-Haute | M | `GET /shopping-lists` | SHOP-1 |
| SHOP-3 | CRUD liste (créer/renommer/supprimer) | ✅ | P-Haute | M | `POST/PUT/DELETE /shopping-lists` | SHOP-2 |
| SHOP-4 | Ajout/suppression article manuel | ✅ | P-Haute | M | `POST/DELETE /shopping-lists/:id/items` | SHOP-2 |
| SHOP-5 | Cocher/décocher article (geste clé magasin + haptique) | ✅ | P-Haute | S | `PUT /shopping-lists/:id/items/:itemId` | SHOP-4 |
| SHOP-6 | Ajout articles depuis inventaire (stock bas, multi-select) | ✅ | P-Moy | M | `POST /shopping-lists/:id/items/from-inventory`, `GET /products` | SHOP-4 |
| SHOP-7 | Transfert articles cochés → stock (choix emplacement) | ✅ | P-Moy | M | `POST /shopping-lists/:id/transfer`, `GET /locations` | SHOP-5 |
| SHOP-8 | Offline/optimistic sur le cochage | ✅ | P-Basse | M | — | SHOP-5, OFFLINE-1 |

*Points d'attention.* Optimistic UI + haptique au cochage (usage debout en magasin, réseau instable). Epic **indépendante de l'inventaire** → peut être menée en parallèle par un second dev. Backend complet et totalement inutilisé côté mobile.

---

### Epic F — Scanner (code-barre + ticket de caisse)

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| SCAN-0 | **Plomberie permissions plateforme** : `mobile_scanner` + `permission_handler`, CAMERA dans `AndroidManifest.xml`, `NSCameraUsageDescription` dans `Info.plist`, bump minSdk. Prérequis bloquant. | ⬜ | P-Haute | M | — | — |
| SCAN-1 | Intégration caméra + flux scan | ⬜ | P-Haute | L | — | SCAN-0 |
| SCAN-2 | Lookup produit par code-barre + feedback (haptique/son) | ⬜ | P-Haute | M | `GET /products/barcode/:code` (proxy Open Food Facts) | SCAN-1 |
| SCAN-3 | **Saisie manuelle code-barre (fallback obligatoire caméra/OFF muet)** | ⬜ | P-Haute | S | `GET /products/barcode/:code` | SCAN-1 |
| SCAN-4 | Flux scan → pré-remplissage formulaire ajout produit, **merge si formulaire déjà ouvert** | ⬜ | P-Haute | M | `POST /products` | SCAN-2, INV-6 |
| SCAN-5 | Refus de permission caméra : message clair + bouton "ouvrir réglages" | ⬜ | P-Haute | S | — | SCAN-0 |
| SCAN-6 | Libérer la caméra quand l'app passe en arrière-plan (cycle de vie) | ⬜ | P-Moy | S | — | SCAN-1 |
| SCAN-7 | Scan ticket de caisse (upload image, **compression préalable**, OCR) | ⬜ | P-Basse | L | `POST /receipts/scan` | SCAN-0, INV-10 |
| SCAN-8 | Édition/validation articles OCR : emplacement/catégorie + **estimation péremption auto réutilisée (cf. INV-9)**, ajout multiple, **indicateur de confiance**, **alerte si ticket non-alimentaire**, affichage texte OCR brut (debug) | ⬜ | P-Basse | L | `POST /products`, `GET /locations`, `GET /categories` | SCAN-7 |
| SCAN-9 | Historique tickets scannés (lister/voir/supprimer) | ⬜ | P-Basse | M | `GET /receipts`, `GET /receipts/:id`, `DELETE /receipts/:id` | SCAN-7 |

*Points d'attention.* Le FAB central mène aujourd'hui à un stub. **La caméra ne fonctionne pas sur émulateur** (flux simulé) → le scanner n'est validable **que sur device physique**, tard dans le cycle : c'est une dépendance matérielle cachée du différenciateur #1. Le lookup OFF dépend d'internet **et** de l'existence du produit dans leur base (peut ne rien renvoyer) → SCAN-3 (saisie manuelle) est le **fallback de scène** indispensable. **L'OCR (SCAN-7/8) est Tesseract.js serveur en FR, lent et peu fiable sur photos de ticket** → strictement **Phase 1+**, jamais en démo live. Parité web : pages `/products` (scan dans la modale produit) et `/scan`.

---

### Epic G — Recettes

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| REC-1 | Couche data + modèles recettes | ⬜ | P-Moy | M | `GET /recipes` | — |
| REC-2 | Suggestions (anti-gaspi, barre correspondance ingrédients) | ⬜ | P-Moy | M | `GET /recipes/suggestions` | REC-1, PROF-2 |
| REC-3 | Liste "Toutes" + filtres (recherche/régime/durée) + tri | ⬜ | P-Basse | M | `GET /recipes` | REC-1 |
| REC-4 | Détail recette (ingrédients dispo/manquant, étapes) | ⬜ | P-Moy | M | `GET /recipes/:id` | REC-1 |
| REC-5 | Favoris (ajout/retrait optimiste) | ⬜ | P-Basse | S | `POST/DELETE /recipes/:id/favorite` | REC-4 |
| REC-6 | "J'ai cuisiné" (portions, note, décrément stock) | ⬜ | P-Basse | M | `POST /recipes/:id/cook` | REC-4 |
| REC-7 | Historique des recettes cuisinées | ⬜ | P-Basse | S | `GET /recipes/history` | REC-1 |

*Parité web : page `/recipes`. Suggestions anti-gaspi alimentées par les régimes/allergies du profil (PROF-2). Backend complet, inutilisé côté mobile.*

---

### Epic H — Dépenses & budget

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| EXPN-1 | Couche data + modèles dépenses | ⬜ | P-Moy | M | `GET /expenses` | — |
| EXPN-2 | Liste dépenses + **filtre période via params `from`/`to`** + **total hors remboursements + distinction visuelle des lignes "Remboursement"** | ⬜ | P-Moy | M | `GET /expenses?from=&to=` | EXPN-1 |
| EXPN-3 | Ajout/édition dépense (montant, payeur, catégorie, partage) | ⬜ | P-Moy | L | `POST/PUT /expenses` | EXPN-2, FOY-2 |
| EXPN-4 | Suppression dépense (confirmation) | ⬜ | P-Basse | S | `DELETE /expenses/:id` | EXPN-2 |
| EXPN-5 | Balances entre membres + **transactions suggérées (settlement minimal)** + "marquer remboursé" | ⬜ | P-Moy | M | `GET /expenses/balances`, `POST /expenses/settle` | EXPN-2, FOY-2 |
| EXPN-6 | Budgets par catégorie (suivi, upsert, suppression) | ⬜ | P-Basse | M | `GET /budgets`, `POST /budgets`, `DELETE /budgets/:id` | EXPN-1 |
| EXPN-7 | Historique d'audit (suppressions/règlements) | ⬜ | P-Basse | S | `GET /expenses/audit-log` | EXPN-2 |

*Parité web : page `/expenses`. La règle métier "total hors remboursements" + distinction visuelle des lignes Remboursement, et les transactions suggérées de settlement, sont présentes sur le web et doivent être reproduites. Le partage de dépense nécessite la liste des membres (FOY-2).*

---

### Epic I — Foyer & collaboration

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| FOY-1 | Liste foyers + bascule foyer actif + **persistance locale du `selectedHouseholdId`** | ⬜ | P-Moy | M | `GET /households` | TECH-2 |
| FOY-2 | Détail foyer + liste membres (avatar, email, rôle) | ⬜ | P-Moy | M | `GET /households/:id` | FOY-1 |
| FOY-3 | Créer un foyer (nom, devise, budget) | ⬜ | P-Basse | S | `POST /households` | FOY-1 |
| FOY-9 | **Modifier un foyer (nom, devise, budget)** | ⬜ | P-Basse | S | `PUT /households/:id` | FOY-2 |
| FOY-4 | Inviter un membre par email + rôle | ⬜ | P-Moy | M | `POST /households/:id/invite` | FOY-2 |
| FOY-5 | Invitations reçues : accepter/refuser | ⬜ | P-Moy | M | `GET /households/invitations/pending`, `POST /households/invite/accept`, `POST /households/invite/decline` | FOY-1 |
| FOY-6 | Lien d'invitation copiable + régénération | ⬜ | P-Basse | S | `POST /households/:id/refresh-token` | FOY-2 |
| FOY-7 | Gestion membres (changer rôle, retirer) | ⬜ | P-Basse | M | `PUT /households/:id/members/:userId/role`, `DELETE /households/:id/members/:userId` | FOY-2 |
| FOY-8 | Quitter un foyer | ⬜ | P-Basse | S | `POST /households/:id/leave` | FOY-2 |

*Points d'attention.* **FOY-1/TECH-2 ne sont PAS sur le chemin critique Phase 0** : le backend retombe déjà sur le premier foyer quand `X-Household-Id` est absent, donc un compte **mono-foyer** fonctionne de bout en bout aujourd'hui. Le `households.first` mobile actuel n'est qu'un **libellé d'AppBar**. Ces tickets ne deviennent structurants que pour un scénario **multi-foyer explicite**. FOY-1 doit persister localement le foyer choisi (le web persiste `selectedHouseholdId`) pour la cohérence inter-sessions. Parité web : page `/household`.

---

### Epic J — Statistiques

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| STAT-1 | KPIs (valeur stock, périmés, taux gaspillage, consommé) | ⬜ | P-Moy | M | `GET /stats` | — |
| STAT-2 | Graphiques (répartition catégories, état péremption, consommé vs gaspillé) | ⬜ | P-Basse | L | `GET /stats` | STAT-1 |
| STAT-3 | Export CSV (téléchargement/partage fichier) | ⬜ | P-Basse | S | `GET /stats/export` | STAT-1 |

*Points d'attention.* STAT-1 a une **double valeur** : feature stats **et** dette de conception du dashboard (HOME-8 remplacerait 3 requêtes + agrégation client par un seul `GET /stats`). À envisager plus tôt que sa priorité stricte ne le suggère. Parité web : page `/stats`.

---

### Epic K — Compte / Profil & menu "Plus"

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| MORE-1 | Écran "Plus" : menu de navigation réel (ListTile) vers sections | ⬜ | P-Haute | S | — | — |
| MORE-2 | Bouton Déconnexion dans "Plus" (+ confirmation) | ⬜ | P-Moy | S | — | AUTH-5 |
| PROF-1 | Profil : affichage infos (nom, email, préférences alimentaires, allergies) | ⬜ | P-Moy | M | `GET /auth/me` | MORE-1 |
| PROF-2 | Édition profil incl. **régimes/préférences alimentaires + allergies** (alimentent les suggestions anti-gaspi) | ⬜ | P-Moy | M | `PUT /auth/profile` | PROF-1, AUTH-11 |
| PROF-3 | Upload/retrait photo de profil (compression préalable) | ⬜ | P-Basse | M | `PUT /auth/profile` | PROF-2 |
| PROF-4 | Changement de mot de passe | ⬜ | P-Moy | S | `PUT /auth/password` | PROF-1 |
| MORE-3 | Paramètres app (thème clair/sombre, langue, à propos/version) | ⬜ | P-Basse | M | — | DS-2, I18N-1 |

*Points d'attention.* "Plus" est aujourd'hui un stub. **MORE-1 (menu réel) doit être en Phase 0** pour ne pas présenter un onglet vide ; MORE-2 (logout depuis "Plus") est un confort (le logout existe déjà via le dashboard).

---

### Epic L — Notifications

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| NOTIF-1 | Notifications locales alertes péremption : `flutter_local_notifications` + **permission POST_NOTIFICATIONS (Android 13+)** + scheduling/timezone | ⬜ | P-Basse | L | `GET /products/expiring` | INV-1 |
| NOTIF-2 | Push notifications (FCM) — **nécessite endpoint backend de registration à créer** | ⬜ | P-Basse | L | _(backend absent)_ | NOTIF-1 |

*Points d'attention.* NOTIF-1 (local) est un `L` souvent sous-estimé (permission runtime, package, scheduling par timezone). NOTIF-2 demande un travail backend préalable (aucun endpoint de push/device-registration côté API).

---

### Epic M — Transverse / Technique

| ID | Titre | Statut | Prio | Taille | Notes | Deps |
|----|-------|--------|------|--------|-------|------|
| TECH-1 | Intercepteur 401 (logout auto + redirect) + `LogInterceptor` dev — **= AUTH-6, même travail** | ✅ | P-Haute | M | débloque toute l'app authentifiée | — |
| TECH-2 | Intercepteur entête `X-Household-Id` (parité web) | ⬜ | P-Moy | S | utile seulement en multi-foyer | FOY-1 |
| TECH-3 | Helpers de navigation typée (constantes routes partagées) | ⬜ | P-Moy | S | évite chaînes magiques | — |
| TECH-4 | `errorBuilder` / route 404 dans go_router | ⬜ | P-Basse | S | — | — |
| TECH-5 | `PopScope` sur la coquille à onglets (bouton retour Android : onglet précédent / sortie) | ⬜ | P-Moy | S | comportement Android attendu | — |
| TECH-6 | Re-validation `/auth/me` au `AppLifecycleState.resumed` | ⬜ | P-Basse | S | cycle de vie | AUTH-7 |
| TECH-7 | Réorganisation : découpler `core → features` dans le routeur | ⬜ | P-Basse | S | hygiène archi | — |
| DS-1 | Tokens de style centralisés (tailles, durations, alphas) + retrait hex en dur | ⬜ | P-Moy | M | source unique avec le DS (zip) | — |
| DS-2 | Dark theme + `themeMode` (suivi système) | ⬜ | P-Basse | M | — | DS-1 |
| UI-1 | Widgets états réutilisables (loading, erreur+retry, vide) | ✅ | P-Haute | M | **base de tous les écrans data** | — |
| UI-2 | Gestion d'erreurs réseau différenciée (401/5xx/timeout/parse) + SnackBar globale | ⬜ | P-Haute | M | au moins partiel en Phase 0 (anti-stacktrace en démo) | TECH-1 |
| UI-3 | Retour haptique (onglets, FAB, cochage, succès/échec) | ⬜ | P-Basse | S | — | — |
| A11Y-1 | Accessibilité barre custom + écrans (`Semantics`, labels, états `selected`) | ⬜ | P-Basse | M | — | — |
| OFFLINE-1 | Détection connectivité + cache lecture (produits/listes) ; **choix techno (Hive/Isar/sqflite/drift) + stratégie de réconciliation** | ⬜ | P-Basse | L | mode dégradé magasin | — |
| DEEP-LINK | Deep links : logique applicative **+ config plateforme (intent-filters Android, Universal Links/Associated Domains iOS)** | ⬜ | P-Basse | M | reset password, invitation foyer | — |
| I18N-1 | Externalisation des chaînes (`intl`/arb) FR (+ EN optionnel) | ⬜ | P-Basse | L | tout est en dur aujourd'hui | — |
| TEST-1 | Tests unitaires (`fromJson`, repositories, providers) | ⬜ | P-Moy | M | — | — |
| TEST-2 | Tests widget (écrans clés) + golden (Design System) | ⬜ | P-Basse | M | — | TEST-1 |
| CI-1 | CI (`flutter analyze` + `flutter test` + build) | ⬜ | P-Moy | S | — | TEST-1 |
| ENV-1 | **Réseau device de démo** : doc + script base URL LAN, backend bind `0.0.0.0`, même wifi, **`network_security_config.xml` (Android cleartext) / exception ATS `Info.plist` (iOS)** | ⬜ | **P-Haute** | M | **bloquant soutenance** (voir DEMO-1) | — |
| SPLASH-1 | Timeout de sécurité UX sur le splash (fallback si `/auth/me` bloque ou lecture Keystore lente) | ⬜ | P-Haute | S | anti-blocage démo | AUTH-7 |
| BUILD-1 | Pipeline build/signing/distribution APK Android (keystore) + canal de test | ⬜ | P-Moy | M | livrable démo | — |

---

## 5. Phasage / Jalons

> **Hypothèse de capacité** : le périmètre Phase 0 du brouillon (~24 tickets, plusieurs M/L greenfield) était **~1,5-2x trop large** pour ~12j. Cette version **dégraisse à un seul différenciateur** (Scanner traité en best-effort avec fallback) et sort de Phase 0 : FOY-1/TECH-2 (mono-foyer suffit), OCR (SCAN-7/8), SHOP-6/7, EXP-1, PROF-1, HOME-4.

### Phase 0 — MVP soutenance (~12j, d'ici le 6 juillet 2026)

**Parcours frozen (script 5 min)** : se connecter → voir son frigo → (scanner OU saisir un code-barre) → ajouter le produit → l'ajouter à une liste de courses → le cocher.
**Règle** : aucun ticket hors de ce happy-path n'entre en Phase 0.

**Lot 0 — Fondations démo (jours 1-2, À FAIRE EN PREMIER)**
- **DEMO-1** (voir §7) : réseau du téléphone de démo (ENV-1) + **données de seed** + répétition sur le **vrai device**. *Rien d'autre ne compte si l'app ne joint pas l'API sur le device.*
- SPLASH-1 (timeout splash), AUTH-7 (ne pas déconnecter sur réseau).
- TECH-1 / AUTH-6 (401, un seul ticket), UI-1 (états loading/erreur/vide), **UI-2 au moins partiel** (SnackBar de repli, pas de stacktrace au vidéoprojecteur).

**Lot fonctionnel démontrable**
- **Inventaire (faible risque, fait tôt)** : INV-0, INV-1, INV-2 (+ INV-3/INV-4 si marge). Rend 2 onglets sur 5 réels.
- **Ajout produit (chemin critique, démarrer tôt)** : INV-6 (dépend de INV-0).
- **Courses (indépendant, parallélisable)** : SHOP-1 → SHOP-5.
- **Scanner (best-effort, en DERNIER à cause du device)** : SCAN-0, SCAN-1, SCAN-2, **SCAN-3 (fallback de scène)**, SCAN-4, SCAN-5 (refus permission).
- **Polish bon marché** : MORE-1 (menu réel), HOME-3 (tuiles cliquables).

**Ordre optimal** : (1) DEMO-1 + seed → (2) TECH-1/AUTH-6 + AUTH-7 + UI-1/UI-2 + SPLASH-1 → (3) INV-0 → INV-1/INV-2 → (4) INV-6 (chemin critique) → (5) SHOP-1→5 (en parallèle, 2e dev) → (6) SCAN-0/1/2/3/4/5 (en dernier, device requis) → (7) MORE-1 + HOME-3.

**Dé-risque du différenciateur** : construire SCAN-4 (pré-remplit INV-6) mais garder SCAN-3 (saisie manuelle) prêt en scène ; un code-barre choisi et répété qui résout sur Open Food Facts. Si le scanner glisse, le parcours login → inventaire → ajout → liste → cochage **reste démontrable** sans lui.

### Phase 1 — Parité des usages quotidiens (post-soutenance)
- Inventaire complet : INV-5/7/8/9/10/11, INV-12/13 (emplacements), INV-14/15 (catégories).
- Scanner complet : SCAN-6 (cycle de vie caméra), SCAN-7/8 (ticket OCR), SCAN-9 (historique).
- Courses : SHOP-6/7/8.
- Péremptions : EXP-1/2. Foyer : FOY-1/2/4/5 + TECH-2 (multi-foyer), FOY-9.
- Profil : PROF-1/2/4. Compte : MORE-2.
- Transverse : UI-3, TECH-3/4/5/6, DS-1, ENV-1 (finalisation iOS), BUILD-1, TEST-1, CI-1, AUTH-8/11.

### Phase 2 — Parité avancée
- Recettes (Epic G), Dépenses & budget (Epic H), Foyer complet (FOY-3/6/7/8/9), Statistiques (Epic J incl. HOME-8), Profil complet (PROF-3).
- AUTH-9 (reset deep link), DEEP-LINK.

### Phase 3 — Polish & extension
- Notifications (Epic L), OFFLINE-1, DS-2 (dark), A11Y-1, I18N-1, TEST-2, AUTH-10, INV-16, TECH-7.

---

## 6. Chantiers transverses (récapitulatif)

| Chantier | Tickets | État | Note |
|----------|---------|------|------|
| **Fondations démo** | DEMO-1, ENV-1, SPLASH-1, BUILD-1 | ⬜ | **Bloquant soutenance** : réseau LAN + cleartext + seed + répétition sur device. Phase 0, jours 1-2. |
| **401 (pas de refresh)** | TECH-1 (= AUTH-6), AUTH-7 | ✅ | AUTH-7 (démarrage/hors-ligne) + AUTH-6/TECH-1 (401 runtime → logout) livrés. Absence de refresh-token **à confirmer côté backend**. |
| **États UI** | UI-1, UI-2 | ⬜ | Prérequis de tous les écrans data ; UI-2 au moins partiel en Phase 0 (anti-stacktrace). |
| **Sérialisation produit** | INV-0 | ⬜ | Prérequis explicite de tout write produit (modèle `Product` read-only vérifié). |
| **Design System & thème** | DS-1, DS-2 | ⬜ | Source unique (zip DS), retrait hex en dur ; dark en Phase 3. |
| **Multi-foyer** | FOY-1, TECH-2 | ⬜ | **Hors chemin critique Phase 0** (backend retombe sur le 1er foyer). Persister `selectedHouseholdId`. |
| **Hors-ligne / cache** | OFFLINE-1, SHOP-8 | 🟠 | **SHOP-8 livré** (file de cochages persistée en secure storage, rejeu au retour réseau). OFFLINE-1 (cache lecture généralisé + choix techno DB) reste à trancher. |
| **Plateforme mobile** | SCAN-0, SCAN-5/6, NOTIF-1, TECH-5/6, DEEP-LINK | ⬜ | Permissions runtime (caméra/notifs au manifest), cycle de vie caméra, PopScope, intent-filters/Universal Links. |
| **Compression d'image** | INV-10, PROF-3, SCAN-7 | ⬜ | Photos caméra lourdes : redimensionner avant upload ; `image_picker` (galerie vs caméra). |
| **Push notifications** | NOTIF-1 (local), NOTIF-2 (push) | ⬜ | Local faisable ; push nécessite backend à créer. |
| **i18n** | I18N-1 | ⬜ | Tout est en FR en dur ; externaliser via `intl`/arb. |
| **Tests / CI** | TEST-1/2, CI-1 | ⬜ | Aucun test ; commencer par `fromJson`/repos. |
| **Cohérence champ `name`** | AUTH-11 | ⬜ | Register fusionne prénom+nom ; aligner avec PROF-2. |
| **Accessibilité** | A11Y-1, UI-3 | ⬜ | Barre custom sans `Semantics` ; haptique absente. |

---

## 7. Notes de cadrage

- **DEMO-1 — risque #1 de la soutenance.** L'app frappe une API réelle sans mock, base URL par défaut = émulateur (`10.0.2.2`). Un téléphone physique exige : IP LAN du laptop, backend bind `0.0.0.0`, même wifi, **cleartext HTTP autorisé** (`network_security_config.xml` Android / exception ATS iOS — sinon échec réseau silencieux et confus en scène). À faire **plusieurs jours avant**, répété sur le device.
- **Données de seed obligatoires.** "Aucune donnée mockée" implique que le compte de démo contienne, avant le jury : un frigo crédible, un produit qui périme bientôt, un produit à code-barre **connu d'Open Food Facts**, une liste de courses. Aucun ticket actuel ne garantit cet état → tâche Phase 0.
- **Plan de repli réseau.** Si le wifi du lieu ou le backend flanche, tous les écrans cassent. Mitigation : backend lancé **en local sur le laptop de démo**, téléphone en partage de connexion, parcours répété. Chaque écran data dégrade vers un bouton "réessayer" (UI-1/UI-2), jamais une stacktrace.
- **Émulateur = caméra simulée.** Le scanner n'est validable que sur device réel, provisionné et autorisé avant la répétition. Garder SCAN-3 (saisie manuelle) comme fallback de scène.
- **Open Food Facts.** Le lookup code-barre dépend d'internet et de l'existence du produit ; choisir et répéter un code-barre qui résout.
- **iOS sous contrainte.** L'environnement de dev est **Windows** : pas de build iOS sans Mac (pods, codesigning pour `mobile_scanner`/`secure_storage`). **Confirmer que la démo est sur Android** ; iOS est un chantier séparé (Phase 1+).
- **Pas de refresh token côté API (à vérifier).** Aucun `/auth/refresh` dans l'inventaire des endpoints → stratégie retenue "401 = logout propre + retour login". Affirmation **déduite de l'absence d'endpoint**, à confirmer côté backend avant de figer.
- **Reset password.** Le web a une page `/reset-password` complète ; l'asymétrie de priorité mobile (AUTH-9 en Phase 2) est un choix de cadrage, pas une contrainte d'API (les endpoints existent).
- **Convention équipe.** 1 commit propre par ticket livré de bout en bout et vérifié ; dialogs/bottom sheets Flutter natifs (jamais de dialogues navigateur).
- **Réutilisation.** Extraire les helpers d'urgence/couleur/péremption de `home_screen.dart` vers une couche partagée avant toute duplication dans Inventaire/Péremptions.
- **Écart API ↔ mobile.** Le backend couvre déjà l'ensemble des epics ci-dessus (sauf push notifications) ; le travail mobile est essentiellement du câblage UI + état + plomberie plateforme, pas du backend.