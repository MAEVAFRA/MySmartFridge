# ROADMAP — MySmartFridge Mobile (Flutter)

> Application mobile compagnon de l'API Node/Express et du web React MySmartFridge.
> Objectif : gérer son frigo, ses courses, ses dépenses et son foyer depuis le téléphone, avec scan de produits/tickets en mobilité.
> Soutenance école : **6 juillet 2026** — ce ROADMAP cadre un MVP démontrable et fiable (~12j, périmètre dégraissé) puis un backlog complet vers la parité web.

---

## 1. Vision

Le mobile vise la **parité fonctionnelle progressive** avec le web, en priorisant les usages "en mobilité" (scan code-barre, liste de courses cochable en magasin, alertes péremption). L'API backend est complète et stable : la quasi-totalité du travail mobile consiste à **câbler des endpoints existants** sur des écrans Flutter cohérents avec le Design System.

**Principe directeur Phase 0** : un seul parcours de démonstration, frozen, répété sur le vrai téléphone. Tout ticket hors de ce parcours est explicitement post-soutenance.

---

## 2. État actuel (audit complet du 2026-07-02 — code vérifié ; `flutter analyze` : 0 issue ; **72 tests, tous verts**)

### Socle technique — solide
- ✅ Bootstrap app (`ProviderScope` + `MaterialApp.router`), thème Material3 **clair + sombre** (`themeMode` persisté, réglable dans Paramètres — DS-2 livré), palette `AppColors`.
- ✅ **URL d'API configurable dans l'app** : écran « Serveur/API » (testée, persistée via `SettingsStorage`, modifiable en runtime), accessible **même déconnecté** — en plus du `--dart-define API_BASE_URL`. Exception ATS iOS pour HTTP clair. Reste (ENV-1) : `network_security_config.xml` Android par précaution + doc réseau device physique + répétition sur device.
- ✅ Client Dio (timeouts 15 s connect/receive) + JWT injecté, **intercepteur 401 global** (logout auto, endpoints d'auth publics exclus), helper `isNetworkError` (connectivité vs réponse serveur), `LogInterceptor` en debug.
- ✅ Restauration de session avec **mode dégradé hors ligne** (AUTH-7) ; stockage sécurisé du token.
- ✅ go_router piloté par l'auth ; coquille 4 onglets + FAB **Scanner réel** (route plein écran) ; routes plein écran : profil (+édition), mot de passe, réglages app, réglages serveur, emplacements (+détail), catégories (+détail), péremptions — chacune avec fiche produit enfant.
- ✅ Widgets d'états réutilisables (`LoadingView`/`ErrorRetryView`/`EmptyView`) + `ErrorBanner` (UI-1 livré).
- ✅ **8 fichiers de tests** (JWT, intercepteur 401, buckets péremption, file offline SHOP-8, modèles, filtrage/tri/pagination inventaire, profil/avatar, widget login). Pas encore de CI ni de pipeline APK.

### Fonctionnel — 5 onglets sur 5 réels, 4 épics complètes
- ✅ **Auth** (AUTH-1→7) : login, register, forgot-password, restauration + mode dégradé, logout, 401 global. Complet.
- ✅ **Accueil/Dashboard** : salutation, « À consommer vite » + « Mon stock », pull-to-refresh, tuiles/lignes cliquables (HOME-3). Restent : logout sans confirmation (HOME-4), pas d'actions rapides (HOME-5), pas de lien « voir tout » vers Péremptions (HOME-6), hex en dur (HOME-7), toujours 3 round-trips au lieu de `GET /stats` (HOME-8).
- ✅ **Inventaire — épic complète (INV-0→16)** : liste groupée par emplacement, recherche/filtres/tri, détail, **ajout/édition**, **suppression avec motif** (consommé/jeté/retiré), **photo compressée** (caméra/galerie, 1000px/70 %), **estimation auto de péremption**, **lookup code-barre depuis le formulaire**, **CRUD emplacements + détail**, **CRUD catégories + profils de conservation + détail**, **pagination lazy-load** (côté client, pages de 20).
- ✅ **Courses — épic complète (SHOP-1→8)** : CRUD listes, articles, cochage optimiste + haptique, ajout depuis l'inventaire (multi-select, stock bas), transfert des cochés vers le stock, file offline persistée + rejeu (timer 20 s + resume) + bandeau « en attente ».
- ✅ **Scanner — SCAN-0→6 livrés** : caméra `mobile_scanner` (EAN-13/8, UPC-A/E), torche, overlay de visée, lookup `GET /products/barcode/:code` + haptique, **saisie manuelle en fallback** (dialog, 6-14 chiffres), refus de permission géré (message + « Ouvrir les réglages »), libération caméra en arrière-plan (lifecycle observer), **pré-remplissage du formulaire d'ajout** (SCAN-4). Restent : OCR ticket (SCAN-7/8/9).
- ✅ **Péremptions (EXP-1/2)** : fenêtre 3/7/14/30 j, sections périmés/à venir, code couleur + libellés relatifs partagés, fiches produit cliquables, état « tout va bien ».
- ✅ **Plus (MORE-1)** : menu réel → Profil, Péremptions, Emplacements, Catégories, Paramètres, Serveur/API ; Recettes / Dépenses / Statistiques / Foyer affichés « Bientôt » (désactivés proprement). Pas de bouton Déconnexion dans ce menu (MORE-2).
- ✅ **Profil (PROF-1→4) + Paramètres (MORE-3)** : affichage (nom, email, régimes, allergies), édition complète, avatar caméra/galerie compressé (400px/80 %), changement de mot de passe, thème clair/sombre/système + « À propos » (version via `package_info_plus`).
- ⬜ **Recettes, Dépenses & budget, Foyer, Statistiques, Notifications** : non commencés (épics G/H/I/J/L) — backend prêt, entrées « Bientôt » dans le menu Plus.

### Dettes / manques restants (vérifiés dans le code au 2026-07-02)
- ⚠️ **Logout brut** : bouton AppBar du dashboard qui déconnecte **sans confirmation** (HOME-4) et absent du menu « Plus » (MORE-2). Petit, visible en démo.
- ⚠️ **Erreurs réseau peu différenciées hors réglages serveur** (UI-2 partiel) : la plupart des écrans affichent un message générique (« Vérifie ta connexion… ») quel que soit le cas (timeout/4xx/5xx/parse). Aucune stacktrace ne fuit (UI-1 ok), mais l'utilisateur ne sait pas si c'est lui ou le serveur.
- ⚠️ **SHOP-8 — rollback silencieux** : si le serveur rejette un cochage (ex : article supprimé ailleurs), la surcharge optimiste est retirée après invalidation avec une SnackBar générique — l'article « se décoche tout seul » sans explication (voir SHOP-9).
- ⚠️ **INV-16 côté client uniquement** : tous les produits sont chargés en RAM puis affichés par tranches ; pas de pagination API (le backend n'expose pas de params `page`/`limit`). OK à l'échelle d'un foyer, limite au-delà de quelques milliers de produits. Recherche sans debounce (recalcul + reset pagination à chaque frappe).
- ⚠️ **SPLASH-1 partiel** : l'attente au démarrage est bornée par les timeouts Dio (15 s max) + mode dégradé AUTH-7, mais pas de timeout sur la lecture Keystore ni d'UI d'attente/fallback si ça traîne.
- ⚠️ **`X-Household-Id` toujours absent** (TECH-2) — mono-foyer fonctionne (le backend retombe sur le 1er foyer). Pas de `PopScope` sur la coquille (TECH-5 : retour Android = fermeture de l'app), pas d'`errorBuilder`/404 go_router (TECH-4), noms de routes = chaînes (TECH-3 partiel : routes nommées mais pas de classe centralisée), couplage `core → features` dans le routeur (TECH-7, ~26 imports), revalidation au resume limitée à la file courses (TECH-6).
- ⚠️ **Haptique partielle** (UI-3) : présente sur scan réussi + cochage/multi-select courses ; absente des onglets/FAB et des succès/échecs de formulaires. Pas de `Semantics` sur la barre custom (A11Y-1). Tout en FR en dur, zéro `.arb` (I18N-1).
- ⚠️ **Hex en dur restants** dans `home_screen.dart` (~9 couleurs) et `auth_widgets.dart` (HOME-7/DS-1) — ces écrans ne suivent pas les tokens alors que le dark theme est livré.
- ⚠️ **AUTH-11 toujours ouvert** : register fusionne prénom+nom en un champ `name` non réversible ; l'édition de profil expose logiquement un unique champ « nom complet ».
- ⚠️ **Pas de CI** (CI-1) ni de pipeline APK signé (BUILD-1). Tests widget quasi absents (TEST-2 : 1 seul, login).
- ⚠️ Divers : duplication des formulaires emplacement/catégorie, validators email dupliqués dans les 3 écrans auth (AUTH-8), 404 sur fiche produit supprimée ailleurs géré génériquement, pas de son au scan (haptique seulement).

**Capacités backend disponibles mais non exploitées côté mobile** : recipes (complet), expenses + budgets, households (complet), stats + export (dont HOME-8), receipts (scan OCR Tesseract.js côté serveur, FR), reset-password par deep link.

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
| INV-7 | Édition produit | ✅ | P-Moy | M | `PUT /products/:id` | INV-6 |
| INV-8 | Retrait/suppression produit avec motif (consommé/jeté/retiré) → stats gaspillage | ✅ | P-Moy | M | `DELETE /products/:id` (body `{reason}`) | INV-5 |
| INV-9 | Estimation auto date péremption (catégorie + type emplacement) | ✅ | P-Basse | M | `GET /categories` | INV-6 |
| INV-10 | Photo produit : choix caméra/galerie (`image_picker`) + **compression/redimensionnement avant upload** | ✅ | P-Basse | M | `POST /products` (dataURL/multipart) | INV-6 |
| INV-11 | Pré-remplissage produit via code-barre (depuis scanner) | ✅ | P-Moy | M | `GET /products/barcode/:code` | INV-6, SCAN-2 |
| INV-12 | Gestion emplacements : liste + CRUD | ✅ | P-Basse | L | `GET/POST/PUT/DELETE /locations` | INV-2 |
| INV-13 | Détail emplacement (produits de l'emplacement, comptage) | ✅ | P-Basse | M | `GET /locations/:id` | INV-12 |
| INV-14 | Gestion catégories : liste + CRUD + durées de conservation | ✅ | P-Basse | L | `GET/POST/PUT/DELETE /categories` | — |
| INV-15 | Détail catégorie | ✅ | P-Basse | S | `GET /categories/:id` | INV-14 |
| INV-16 | Pagination / lazy-load liste produits | ✅ | P-Basse | M | `GET /products` | INV-2 |
| INV-17 | Debounce sur la recherche inventaire (éviter recalcul + reset pagination à chaque frappe) | ⬜ | P-Basse | S | — | INV-3 |
| INV-18 | Filtre par **catégorie** + tri par **quantité** (alignement CDC F-17/F-18, manquants aussi côté web pour le filtre catégorie) | ⬜ | P-Basse | S | `GET /products` | INV-3 |

*Points d'attention.* **Épic livrée (INV-0→16, audit 2026-07-02).** Restes qualité : INV-16 est une pagination **côté client** (tout est chargé en RAM ; une pagination serveur exigerait d'abord des params API), la recherche n'a pas de debounce (INV-17), et les erreurs d'écriture affichent des messages génériques (voir UI-2). Les formulaires emplacement/catégorie partagent `form_choices.dart` mais dupliquent validation/soumission (candidat factorisation, non bloquant).

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
| SHOP-9 | Feedback explicite quand un cochage est rejeté par le serveur (rollback silencieux aujourd'hui : l'article « se décoche » avec une SnackBar générique) | ⬜ | P-Basse | S | — | SHOP-8 |

*Points d'attention.* Optimistic UI + haptique au cochage (usage debout en magasin, réseau instable). Epic **indépendante de l'inventaire** → peut être menée en parallèle par un second dev. Backend complet et totalement inutilisé côté mobile.

---

### Epic F — Scanner (code-barre + ticket de caisse)

| ID | Titre | Statut | Prio | Taille | Endpoints | Deps |
|----|-------|--------|------|--------|-----------|------|
| SCAN-0 | **Plomberie permissions plateforme** : `mobile_scanner` + `permission_handler`, CAMERA dans `AndroidManifest.xml`, `NSCameraUsageDescription` dans `Info.plist`, bump minSdk. Prérequis bloquant. | ✅ | P-Haute | M | — | — |
| SCAN-1 | Intégration caméra + flux scan | ✅ | P-Haute | L | — | SCAN-0 |
| SCAN-2 | Lookup produit par code-barre + feedback (haptique/son) | ✅ | P-Haute | M | `GET /products/barcode/:code` (proxy Open Food Facts) | SCAN-1 |
| SCAN-3 | **Saisie manuelle code-barre (fallback obligatoire caméra/OFF muet)** | ✅ | P-Haute | S | `GET /products/barcode/:code` | SCAN-1 |
| SCAN-4 | Flux scan → pré-remplissage formulaire ajout produit, **merge si formulaire déjà ouvert** | ✅ | P-Haute | M | `POST /products` | SCAN-2, INV-6 |
| SCAN-5 | Refus de permission caméra : message clair + bouton "ouvrir réglages" | ✅ | P-Haute | S | — | SCAN-0 |
| SCAN-6 | Libérer la caméra quand l'app passe en arrière-plan (cycle de vie) | ✅ | P-Moy | S | — | SCAN-1 |
| SCAN-7 | Scan ticket de caisse (upload image, **compression préalable**, OCR) | ⬜ | P-Basse | L | `POST /receipts/scan` | SCAN-0, INV-10 |
| SCAN-8 | Édition/validation articles OCR : emplacement/catégorie + **estimation péremption auto réutilisée (cf. INV-9)**, ajout multiple, **indicateur de confiance**, **alerte si ticket non-alimentaire**, affichage texte OCR brut (debug) | ⬜ | P-Basse | L | `POST /products`, `GET /locations`, `GET /categories` | SCAN-7 |
| SCAN-9 | Historique tickets scannés (lister/voir/supprimer) | ⬜ | P-Basse | M | `GET /receipts`, `GET /receipts/:id`, `DELETE /receipts/:id` | SCAN-7 |

*Points d'attention.* **SCAN-0→6 livrés (audit 2026-07-02)** : caméra (EAN-13/8, UPC-A/E), torche, overlay, haptique au scan, saisie manuelle, permissions, lifecycle. Restes qualité : pas de **son** au scan (haptique seule), messages d'erreur lookup génériques. **La caméra ne fonctionne pas sur émulateur** → la validation finale du scanner reste **à faire sur device physique** avant la soutenance (SCAN-3 = fallback de scène). **L'OCR (SCAN-7/8/9) est absent** — Tesseract.js serveur FR, lent et peu fiable → strictement **Phase 1+**, jamais en démo live. Parité web : pages `/products` et `/scan`.

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
| MORE-1 | Écran "Plus" : menu de navigation réel (ListTile) vers sections | ✅ | P-Haute | S | — | — |
| MORE-2 | Bouton Déconnexion dans "Plus" (+ confirmation) | ⬜ | P-Moy | S | — | AUTH-5 |
| PROF-1 | Profil : affichage infos (nom, email, préférences alimentaires, allergies) | ✅ | P-Moy | M | `GET /auth/me` | MORE-1 |
| PROF-2 | Édition profil incl. **régimes/préférences alimentaires + allergies** (alimentent les suggestions anti-gaspi) | ✅ | P-Moy | M | `PUT /auth/profile` | PROF-1, AUTH-11 |
| PROF-3 | Upload/retrait photo de profil (compression préalable) | ✅ | P-Basse | M | `PUT /auth/profile` | PROF-2 |
| PROF-4 | Changement de mot de passe | ✅ | P-Moy | S | `PUT /auth/password` | PROF-1 |
| MORE-3 | Paramètres app (thème clair/sombre, langue, à propos/version) | ✅ | P-Basse | M | — | DS-2, I18N-1 |

*Points d'attention.* **Épic quasi complète (audit 2026-07-02)** : « Plus » est un vrai menu (Profil, Péremptions, Emplacements, Catégories, Paramètres, Serveur/API ; Recettes/Dépenses/Stats/Foyer en « Bientôt » désactivés). MORE-3 livre thème + à propos ; la **langue** reste un placeholder (« bientôt », lié à I18N-1). **Reste MORE-2** : aucune déconnexion depuis « Plus », et celle du dashboard est **sans confirmation** (HOME-4) — les deux ensemble font un seul petit ticket à fort effet démo. Restes qualité PROF : critères de force du mot de passe absents (AUTH-10), toggle visibilité partagé entre les 3 champs.

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
| TECH-6 | Re-validation `/auth/me` au `AppLifecycleState.resumed` (seul le rejeu de la file courses existe au resume) | ⬜ | P-Basse | S | cycle de vie | AUTH-7 |
| TECH-7 | Réorganisation : découpler `core → features` dans le routeur | ⬜ | P-Basse | S | hygiène archi | — |
| DS-1 | Tokens de style centralisés (tailles, durations, alphas) + retrait hex en dur | 🟠 | P-Moy | M | `AppColors`/thèmes ok ; hex en dur restants dans `home_screen.dart` + `auth_widgets.dart` | — |
| DS-2 | Dark theme + `themeMode` (suivi système, persisté, réglable dans Paramètres) | ✅ | P-Basse | M | — | DS-1 |
| UI-1 | Widgets états réutilisables (loading, erreur+retry, vide) | ✅ | P-Haute | M | **base de tous les écrans data** | — |
| UI-2 | Gestion d'erreurs réseau différenciée (401/5xx/timeout/parse) + SnackBar globale | 🟠 | P-Haute | M | différencié dans les réglages serveur + `isNetworkError` (SHOP-8) ; messages génériques partout ailleurs | TECH-1 |
| UI-3 | Retour haptique (onglets, FAB, cochage, succès/échec) | 🟠 | P-Basse | S | fait : scan réussi + cochage/multi-select courses ; manque : onglets, FAB, formulaires | — |
| A11Y-1 | Accessibilité barre custom + écrans (`Semantics`, labels, états `selected`) | ⬜ | P-Basse | M | — | — |
| OFFLINE-1 | Détection connectivité + cache lecture (produits/listes) ; **choix techno (Hive/Isar/sqflite/drift) + stratégie de réconciliation** | ⬜ | P-Basse | L | mode dégradé magasin | — |
| DEEP-LINK | Deep links : logique applicative **+ config plateforme (intent-filters Android, Universal Links/Associated Domains iOS)** | ⬜ | P-Basse | M | reset password, invitation foyer | — |
| I18N-1 | Externalisation des chaînes (`intl`/arb) FR (+ EN optionnel) | ⬜ | P-Basse | L | tout est en dur aujourd'hui | — |
| TEST-1 | Tests unitaires (`fromJson`, repositories, providers) | ✅ | P-Moy | M | 8 fichiers, 72 tests verts (JWT, 401, buckets, file offline, modèles, vue inventaire, profil) | — |
| TEST-2 | Tests widget (écrans clés) + golden (Design System) | 🟠 | P-Basse | M | 1 seul test widget (login) | TEST-1 |
| CI-1 | CI (`flutter analyze` + `flutter test` + build) | ⬜ | P-Moy | S | — | TEST-1 |
| ENV-1 | **Réseau device de démo** : doc + script base URL LAN, backend bind `0.0.0.0`, même wifi, **`network_security_config.xml` (Android cleartext) / exception ATS `Info.plist` (iOS)** | 🟠 | **P-Haute** | M | fait : URL configurable in-app (persistée, accessible déconnecté) + ATS iOS ; reste : config cleartext Android (précaution — `dart:io` ne l'applique pas, à valider sur device) + doc + répétition device | — |
| SPLASH-1 | Timeout de sécurité UX sur le splash (fallback si `/auth/me` bloque ou lecture Keystore lente) | 🟠 | P-Haute | S | attente bornée par timeouts Dio 15 s + mode dégradé AUTH-7 ; pas de borne sur la lecture Keystore ni d'UI de fallback | AUTH-7 |
| BUILD-1 | Pipeline build/signing/distribution APK Android (keystore) + canal de test | ⬜ | P-Moy | M | livrable démo | — |

---

## 5. Phasage / Jalons

> **Point d'étape 2026-07-02 (J-4 avant soutenance)** : la Phase 0 est **entièrement livrée**, ainsi que l'essentiel de la Phase 1 prévue post-soutenance (inventaire complet, scanner complet hors OCR, courses complètes, péremptions, profil, dark theme, tests unitaires). Le parcours de démo « se connecter → voir son frigo → scanner/saisir un code-barre → ajouter le produit → l'ajouter à une liste → le cocher » est **fonctionnel de bout en bout dans le code**. Ce qui reste avant le 6 juillet est de la **préparation de démo**, pas du développement.

### Reste avant la soutenance (6 juillet 2026) — par ordre de priorité

1. **DEMO-1 (bloquant, voir §7)** : réseau du téléphone de démo (IP LAN, backend `0.0.0.0`, même wifi — l'URL est désormais réglable **dans l'app**, écran Serveur/API accessible déconnecté) + **données de seed** (frigo crédible, produit qui périme bientôt, code-barre connu d'Open Food Facts, liste de courses) + **répétition complète sur le vrai device**. Le scanner n'a jamais pu être validé sur émulateur → c'est LE test critique du device.
2. **ENV-1 (reste)** : ajouter `network_security_config.xml` Android par précaution, documenter la procédure réseau, valider le HTTP clair sur le device réel.
3. **Polish bon marché à fort effet démo** (optionnel, ~0,5j) : HOME-4 + MORE-2 (confirmation logout + entrée Déconnexion dans « Plus »), HOME-6 (lien « voir tout » → Péremptions), HOME-5 (actions rapides dashboard).
4. **Filet de sécurité** : SPLASH-1 (borne explicite + UI de fallback — le risque est déjà réduit par les timeouts Dio 15 s et le mode dégradé AUTH-7).

### Phase 1 — Reste à faire post-soutenance
- Scanner : SCAN-7/8 (ticket OCR), SCAN-9 (historique tickets).
- Qualité/UX : UI-2 (erreurs différenciées partout), UI-3 (haptique complète), SHOP-9 (feedback rollback sync), INV-17 (debounce recherche), HOME-4/5/6/7/8, MORE-2.
- Foyer : FOY-1/2/4/5 + TECH-2 (multi-foyer), FOY-9.
- Transverse : TECH-3/4/5/6, DS-1 (retrait hex en dur), BUILD-1 (APK signé), CI-1, AUTH-8/11.

### Phase 2 — Parité avancée
- Recettes (Epic G), Dépenses & budget (Epic H), Foyer complet (FOY-3/6/7/8/9), Statistiques (Epic J incl. HOME-8).
- AUTH-9 (reset deep link), DEEP-LINK.

### Phase 3 — Polish & extension
- Notifications (Epic L), OFFLINE-1 (cache lecture généralisé), A11Y-1, I18N-1, TEST-2 (tests widget/golden), AUTH-10, TECH-7, pagination serveur de l'inventaire (nécessite params API).

---

## 6. Chantiers transverses (récapitulatif)

| Chantier | Tickets | État | Note |
|----------|---------|------|------|
| **Fondations démo** | DEMO-1, ENV-1, SPLASH-1, BUILD-1 | 🟠 | **Seul chantier encore bloquant soutenance.** URL réglable in-app + ATS iOS livrés ; restent : seed + répétition sur device (DEMO-1), cleartext Android + doc (ENV-1), borne Keystore (SPLASH-1), APK signé (BUILD-1, post-soutenance possible). |
| **401 (pas de refresh)** | TECH-1 (= AUTH-6), AUTH-7 | ✅ | AUTH-7 (démarrage/hors-ligne) + AUTH-6/TECH-1 (401 runtime → logout) livrés. Absence de refresh-token **à confirmer côté backend**. |
| **États UI** | UI-1, UI-2 | 🟠 | UI-1 livré (loading/erreur+retry/vide partout). UI-2 partiel : différencié dans les réglages serveur seulement, messages génériques ailleurs — aucune stacktrace ne fuit. |
| **Sérialisation produit** | INV-0 | ✅ | Livré, photo incluse (INV-10). |
| **Design System & thème** | DS-1, DS-2 | 🟠 | **DS-2 livré** (dark + themeMode persisté). DS-1 : hex en dur restants dans `home_screen.dart`/`auth_widgets.dart`. |
| **Multi-foyer** | FOY-1, TECH-2 | ⬜ | Toujours mono-foyer (le backend retombe sur le 1er foyer). Persister `selectedHouseholdId` quand FOY-1 démarre. |
| **Hors-ligne / cache** | OFFLINE-1, SHOP-8, SHOP-9 | 🟠 | **SHOP-8 livré** (file persistée + rejeu timer/resume + bandeau). SHOP-9 : rollback silencieux sur rejet serveur. OFFLINE-1 (cache lecture + choix techno DB) reste à trancher. |
| **Plateforme mobile** | SCAN-0, SCAN-5/6, NOTIF-1, TECH-5/6, DEEP-LINK | 🟠 | **SCAN-0/5/6 livrés** (permissions caméra, refus géré, lifecycle). Restent : notifs locales, PopScope (retour Android ferme l'app), resume global, deep links. |
| **Compression d'image** | INV-10, PROF-3, SCAN-7 | 🟠 | **INV-10 (1000px/70 %) et PROF-3 (400px/80 %) livrés** via `image_picker`. Reste SCAN-7 (photo de ticket). |
| **Push notifications** | NOTIF-1 (local), NOTIF-2 (push) | ⬜ | Local faisable ; push nécessite backend à créer. |
| **i18n** | I18N-1 | ⬜ | Tout est en FR en dur, zéro `.arb` ; l'entrée « Langue » des Paramètres est un placeholder. |
| **Tests / CI** | TEST-1/2, CI-1 | 🟠 | **TEST-1 livré : 72 tests unitaires verts** (JWT, 401, buckets, file offline, modèles, vue inventaire). TEST-2 : 1 seul test widget. CI absente. |
| **Cohérence champ `name`** | AUTH-11 | ⬜ | Register fusionne toujours prénom+nom ; l'édition de profil expose un unique champ « nom complet ». Décision à acter. |
| **Accessibilité** | A11Y-1, UI-3 | 🟠 | Barre custom toujours sans `Semantics`. Haptique livrée sur scan + cochage courses, absente ailleurs. |

---

## 7. Notes de cadrage

- **DEMO-1 — risque #1 de la soutenance.** L'app frappe une API réelle sans mock, base URL par défaut = émulateur (`10.0.2.2`). Un téléphone physique exige : IP LAN du laptop, backend bind `0.0.0.0`, même wifi. **Acquis depuis** : l'URL se règle **dans l'app** (écran Serveur/API avec test de connexion, accessible même déconnecté) et l'exception ATS iOS est en place ; reste la config cleartext Android (`network_security_config.xml`, par précaution — `dart:io` ne l'applique en principe pas, mais **à valider sur le device réel**). À faire **plusieurs jours avant**, répété sur le device — le scanner (caméra) n'a par construction jamais été validé sur émulateur.
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
- **Conformité au cahier des charges.** Comparaison exigence par exigence (F-01→F-56) entre CDC, web et mobile : voir `Documentation/Conformite-CDC-Web-Mobile.md` (2026-07-02). Synthèse : tous les Must Have couverts par le web ; seul écart notable = notifications push (F-26/27, backend absent) ; l'app mobile est un dépassement du CDC (classée Won't Have).