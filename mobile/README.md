# 📱 MySmartFridge — App mobile (Flutter)

Application mobile compagnon de la plateforme **MySmartFridge** (API Node/Express + web React).
Objectif : gérer son frigo, ses courses et ses péremptions depuis le téléphone, avec **scan de code-barre** en mobilité.

> État du projet, épics et tickets : voir [`ROADMAP.md`](ROADMAP.md).
> Conformité au cahier des charges : voir [`../Documentation/Conformite-CDC-Web-Mobile.md`](../Documentation/Conformite-CDC-Web-Mobile.md).

---

## ✨ Fonctionnalités livrées

- **Auth** — inscription, connexion (JWT), mot de passe oublié, restauration de session avec mode dégradé hors ligne, déconnexion.
- **Dashboard** — vue d'ensemble du stock, « à consommer vite », actions rapides (ajouter / scanner).
- **Inventaire** — liste groupée par emplacement, recherche/filtres/tri, fiche produit, ajout/édition, suppression avec motif, photo compressée, estimation auto de péremption, CRUD emplacements & catégories.
- **Péremptions** — fenêtre 3/7/14/30 j, code couleur d'urgence.
- **Courses** — CRUD listes, cochage optimiste **hors ligne** (file persistée + rejeu), ajout depuis l'inventaire, transfert des articles cochés vers le stock.
- **Scanner** — caméra `mobile_scanner` (EAN-13/8, UPC-A/E), lookup Open Food Facts, **saisie manuelle en fallback**, pré-remplissage du formulaire d'ajout.
- **Profil & Paramètres** — édition du profil, avatar, changement de mot de passe, **thème clair/sombre persisté**, écran « À propos ».

> À venir (post-soutenance) : recettes, dépenses & budget, foyer multi-membres, statistiques, OCR ticket de caisse, notifications. Backend déjà prêt côté API.

---

## 🛠️ Stack

| Domaine | Choix |
|---------|-------|
| Framework | Flutter (Dart SDK `^3.12.0`) |
| État | `flutter_riverpod` |
| Réseau | `dio` (JWT injecté, intercepteur 401 global) |
| Navigation | `go_router` (piloté par l'auth) |
| Stockage sécurisé | `flutter_secure_storage` (token, réglages) |
| Scan | `mobile_scanner` + `permission_handler` |
| Photos | `image_picker` (compression avant upload) |
| Thème | Material 3 (clair + sombre) |

---

## 🚀 Lancer l'application

### Prérequis
- [Flutter SDK](https://docs.flutter.dev/get-started/install) installé (`flutter doctor` au vert)
- Un émulateur Android / simulateur iOS, ou un device physique
- Le **backend MySmartFridge** qui tourne (voir le [README racine](../README.md)) — l'app frappe une API réelle, sans mock

### Installation
```bash
cd mobile
flutter pub get
```

### Configurer l'URL du backend

L'app cible l'API via la variable `API_BASE_URL`. Valeur par défaut : `http://10.0.2.2:3001/api`
(`10.0.2.2` = `localhost` du PC hôte, vu depuis l'émulateur Android).

Selon la cible d'exécution :

| Cible | URL à utiliser |
|-------|----------------|
| Émulateur Android | `http://10.0.2.2:3001/api` (défaut) |
| Simulateur iOS | `http://localhost:3001/api` |
| Téléphone physique | `http://[IP_LOCALE_DU_PC]:3001/api` (même wifi, backend bind `0.0.0.0`) |

Surcharge au lancement, sans toucher au code :
```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.20:3001/api
```

> 💡 L'URL est **aussi réglable directement dans l'app** : écran **Plus → Serveur/API** (test de connexion, persistée, accessible **même déconnecté**). Pratique pour une démo sur device physique sans recompiler.

### Lancer
```bash
flutter run                 # sur le device/émulateur connecté
flutter run -d chrome       # dans le navigateur (web)
```

---

## 🧪 Qualité

```bash
flutter analyze             # 0 issue attendu
flutter test                # 8 fichiers de tests, 72 tests
```

Les tests couvrent : JWT, intercepteur 401, buckets de péremption, file offline des courses, modèles, filtrage/tri/pagination de l'inventaire, profil/avatar, et un test widget de login.

---

## 📁 Structure

```
mobile/lib/
├── main.dart                  # bootstrap : charge les réglages persistés puis runApp
├── app.dart                   # MaterialApp.router + thème
├── core/
│   ├── config/                # Env (API_BASE_URL), AppInfo
│   ├── network/               # client Dio, JWT, intercepteur 401
│   ├── router/                # go_router piloté par l'auth
│   ├── storage/               # token + réglages (secure storage)
│   ├── theme/                 # Material 3 clair/sombre, AppColors
│   ├── utils/                 # helpers péremption
│   └── widgets/               # états async (loading/erreur/vide), ErrorBanner
└── features/
    ├── auth/                  # login, register, forgot-password, session
    ├── home/                  # dashboard
    ├── inventory/             # produits, emplacements, catégories
    ├── expiring/              # péremptions
    ├── shopping/              # listes de courses (offline)
    ├── scanner/               # scan code-barre
    ├── profile/               # profil, avatar, mot de passe
    ├── settings/              # réglages app + serveur/API
    ├── more/                  # menu « Plus »
    ├── shell/                 # coquille à onglets + FAB scanner
    └── splash/                # écran de démarrage
```

Chaque feature suit une découpe `data/` (repositories) · `domain/` (modèles) · `application/` (providers Riverpod) · `presentation/` (écrans/widgets).

---

## 📦 Build

```bash
flutter build apk --dart-define=API_BASE_URL=http://[IP]:3001/api    # Android
flutter build ios --no-codesign                                      # iOS (nécessite un Mac)
```

Un pipeline **Codemagic** (`../codemagic.yaml`) construit l'IPA iOS non signée au push.

> ⚠️ Le scanner (caméra) ne fonctionne **pas** sur émulateur — à valider sur device physique.
