# Conformité au cahier des charges — Web (backoffice) vs Mobile

> Comparaison exigence par exigence entre le `CahierDesCharges.docx` (v1.0, mars 2026, F-01→F-56 + priorisation MoSCoW),
> les `UserStories.docx` (US-01→US-15), l'application **web React** (`frontend/`) et l'application **mobile Flutter** (`mobile/`).
> Établie le **2026-07-02** par lecture du code des deux clients (voir aussi `mobile/ROADMAP.md`, audité le même jour).

**Rappel de périmètre** : le CDC définit une **web app responsive (PWA)** ; l'application mobile native y est explicitement classée
**« Won't Have — hors périmètre »** (§7.2). L'app mobile est donc un **dépassement du cahier des charges**, pas une exigence.
La conformité au CDC se juge sur le web ; la colonne mobile mesure la **parité bonus**.

**Légende** : ✅ couvert · 🟠 partiel · ⬜ absent

---

## 1. Couverture exigence par exigence

### EPIC 1 — Authentification & profil

| ID | Exigence | Prio | Web | Mobile | Commentaire |
|----|----------|------|-----|--------|-------------|
| F-01 | Inscription email/mot de passe | Haute | ✅ | ✅ | |
| F-02 | Connexion + JWT | Haute | ✅ | ✅ | |
| F-03 | Déconnexion et invalidation du token | Haute | 🟠 | 🟠 | Logout + effacement local des deux côtés ; **pas d'invalidation serveur** (JWT stateless, pas de blacklist) — écart commun mineur. |
| F-04 | Consultation / modification du profil | Moy | ✅ | ✅ | Mobile : PROF-1/2 (régimes + allergies inclus). |
| F-05 | Réinitialisation mot de passe par email | Moy | ✅ | 🟠 | Web : forgot + page `/reset-password` complète. Mobile : envoi du lien ok, **pas de deep link de reset** (AUTH-9, Phase 2). |
| F-06 | Upload d'avatar | Basse | ✅ | ✅ | Compressé des deux côtés. |

### EPIC 2 — Foyers & membres

| ID | Exigence | Prio | Web | Mobile | Commentaire |
|----|----------|------|-----|--------|-------------|
| F-07 | Créer un foyer (admin) | Haute | ✅ | ⬜ | |
| F-08 | Inviter par email ou lien | Haute | ✅ | ⬜ | Web : lien copiable + régénération du token. |
| F-09 | Rôles (owner/admin/editor/viewer) | Haute | ✅ | ⬜ | |
| F-10 | Retirer un membre / quitter | Moy | ✅ | ⬜ | |
| F-11 | Multi-foyers + switch | Moy | ✅ | ⬜ | Web : `X-Household-Id` + `selectedHouseholdId` persisté. Mobile : **mono-foyer** (le backend retombe sur le 1er foyer) — Epic I du ROADMAP mobile. |

### EPIC 3 — Emplacements & inventaire

| ID | Exigence | Prio | Web | Mobile | Commentaire |
|----|----------|------|-----|--------|-------------|
| F-12 | CRUD emplacements personnalisés | Haute | ✅ | ✅ | Nom, type, icône, couleur, température des deux côtés (US-01/02 satisfaites). |
| F-13 | Ajout produit manuel | Haute | ✅ | ✅ | |
| F-14 | Modifier un produit | Haute | ✅ | ✅ | |
| F-15 | Supprimer un produit | Haute | ✅ | ✅ | Avec motif consommé/jeté/retiré des deux côtés (alimente F-54). |
| F-16 | Recherche par nom | Haute | ✅ | ✅ | Mobile : nom + marque. US-15 demande une recherche **insensible aux accents** — non vérifié des deux côtés. |
| F-17 | Filtres emplacement **et catégorie** | Haute | 🟠 | 🟠 | Web : emplacement + recherche (filtre **catégorie** non retrouvé dans `Products.jsx`). Mobile : emplacement + péremption, **pas de filtre catégorie**. Petit écart commun au CDC. |
| F-18 | Tri péremption / nom / quantité | Moy | ✅ | 🟠 | Web : 4 colonnes triables. Mobile : péremption + nom, **pas quantité**. |
| F-19 | Affecter une catégorie | Moy | ✅ | ✅ | + CRUD catégories complet des deux côtés (au-delà du CDC). |
| F-20 | Photo produit (Open Food Facts) | Moy | ✅ | ✅ | Image OFF via lookup code-barre + photo personnalisée (US-10). |
| F-21 | Scan code-barre → pré-remplissage | Moy | ✅ | ✅ | Web : ZXing. Mobile : `mobile_scanner` + saisie manuelle en fallback. |

### EPIC 4 — Péremptions & alertes

| ID | Exigence | Prio | Web | Mobile | Commentaire |
|----|----------|------|-----|--------|-------------|
| F-22 | Bientôt périmés (3/7/14/30 j) | Haute | ✅ | ✅ | |
| F-23 | Code couleur urgence | Haute | ✅ | ✅ | |
| F-24 | Estimation auto selon catégorie | Haute | ✅ | ✅ | Durées frigo/congélo par catégorie (US-05). |
| F-25 | Date d'ouverture (durée réduite) | Moy | ⬜ | ⬜ | La donnée « durée entamé » existe côté catégories, mais **aucun client ne gère de date d'ouverture** sur le produit. |
| F-26 | Notification push avant péremption | Haute | ⬜ | ⬜ | **Seul « Haute » du CDC non couvert.** Aucun endpoint backend de push (cf. NOTIF-1/2 du ROADMAP mobile ; nécessite HTTPS + FCM/Web Push + CRON). |
| F-27 | Résumé quotidien email/push | Moy | ⬜ | ⬜ | Idem. |
| F-28 | Badge rouge produits périmés | Haute | ✅ | ✅ | |

### EPIC 5 — Scan de ticket de caisse (OCR)

| ID | Exigence | Prio | Web | Mobile | Commentaire |
|----|----------|------|-----|--------|-------------|
| F-29 | Import photo ticket (galerie/caméra) | Haute | ✅ | ⬜ | |
| F-30 | OCR produits + prix | Haute | ✅ | ⬜ | Tesseract.js serveur FR + % de confiance affiché. |
| F-31 | Confirmation/correction avant ajout | Haute | ✅ | ⬜ | Web : édition complète (nom, qté, unité, prix, emplacement heuristique, péremption estimée). |
| F-32 | Ajout en masse | Haute | ✅ | ⬜ | |
| F-33 | Extraction du total | Haute | ✅ | ⬜ | |
| F-34 | Historique des tickets | Moy | ✅ | ⬜ | Mobile : SCAN-7/8/9 = Phase 1+ du ROADMAP. |

### EPIC 6 — Recettes

| ID | Exigence | Prio | Web | Mobile | Commentaire |
|----|----------|------|-----|--------|-------------|
| F-35 | Suggestions selon produits dispo | Haute | ✅ | ⬜ | |
| F-36 | Priorité aux produits proches péremption | Haute | ✅ | ⬜ | Badge « Anti-gaspi ». |
| F-37 | Filtres (végétarien, sans gluten, temps) | Moy | ✅ | ⬜ | |
| F-38 | Détail recette (photo, étapes) | Haute | ✅ | ⬜ | |
| F-39 | Ingrédients dispo vs manquants | Haute | ✅ | ⬜ | |
| F-40 | « J'ai cuisiné » → décrément stock | Haute | ✅ | ⬜ | + retrait auto des produits épuisés. |
| F-41 | Favoris | Moy | ✅ | ⬜ | |
| F-42 | Historique des recettes cuisinées | Basse | ✅ | ⬜ | Mobile : Epic G entière = Phase 2. |

### EPIC 7 — Dépenses & partage

| ID | Exigence | Prio | Web | Mobile | Commentaire |
|----|----------|------|-----|--------|-------------|
| F-43 | Enregistrer une dépense (+ ticket) | Haute | ✅ | ⬜ | |
| F-44 | Split entre membres | Haute | ✅ | ⬜ | Personnelle / égale / personnalisée (parts inégales, US-08 ok). |
| F-45 | Tableau des soldes | Haute | ✅ | ⬜ | + transactions de règlement minimales. |
| F-46 | Marquer remboursé | Haute | ✅ | ⬜ | |
| F-47 | Historique par période | Moy | 🟠 | ⬜ | Web : ce mois / mois dernier / tout — la granularité **semaine** du CDC manque. |
| F-48 | Budget mensuel **par catégorie** + alerte | Basse | 🟠 | ⬜ | Web : suivi du budget courses mensuel (BudgetPanel) ; la déclinaison **par catégorie** avec alerte de dépassement n'est pas visible. Mobile : Epic H = Phase 2. |

### EPIC 8 — Liste de courses

| ID | Exigence | Prio | Web | Mobile | Commentaire |
|----|----------|------|-----|--------|-------------|
| F-49 | Listes partagées CRUD | Moy | ✅ | ✅ | |
| F-50 | Ajout manuel + depuis inventaire | Moy | ✅ | ✅ | Filtre « stock bas » des deux côtés (US-12). |
| F-51 | Cocher + transférer en stock | Moy | ✅ | ✅ | |
| F-52 | Synchronisation **temps réel** | Moy | ⬜ | 🟠 | Aucun WebSocket/SSE (contrainte identifiée au CDC §8.1). Mobile compense partiellement : cochage **hors ligne** avec file persistée et rejeu (SHOP-8) — au-delà du web sur ce point. |

### EPIC 9 — Statistiques

| ID | Exigence | Prio | Web | Mobile | Commentaire |
|----|----------|------|-----|--------|-------------|
| F-53 | Total par période / catégorie / membre | Basse | 🟠 | ⬜ | Web : KPIs + donut par catégorie ; « par membre » vit côté Dépenses/Balances, filtre période limité. |
| F-54 | Taux de gaspillage | Basse | ✅ | ⬜ | Le mobile **alimente** la donnée (motifs de retrait INV-8) mais ne l'affiche pas (Epic J = Phase 2). |
| F-55 | Graphiques (camembert, barres) | Basse | ✅ | ⬜ | |
| F-56 | Export CSV | Basse | ✅ | ⬜ | |

---

## 2. Verdict MoSCoW (CDC §7.2)

| Priorité | Contenu CDC | Verdict |
|----------|-------------|---------|
| **Must Have** | Auth complète, CRUD produits, alertes péremption, foyer multi-membres | ✅ **Couvert par le web.** Mobile : tout sauf le foyer multi-membres (mono-foyer fonctionnel). |
| **Should Have** | Scan ticket OCR, suggestions recettes, photos produits, **notifications push** | 🟠 OCR + recettes + photos couverts par le web. **Les notifications push (F-26/27) sont le seul Should absent partout** — et F-26 est classé « Haute ». |
| **Could Have** | Split dépenses, liste de courses, statistiques, mode hors-ligne | ✅ Split + courses + stats couverts par le web ; hors-ligne partiellement couvert **par le mobile uniquement** (file de cochage SHOP-8 ; US-14 non couverte en lecture). |
| **Won't Have** | App mobile native, IA image, livraison | 🚀 **Dépassé** : l'app mobile Flutter existe (5 onglets réels, 4 épics complètes, scanner code-barre natif) alors qu'elle était hors périmètre. |

## 3. Écarts restants au CDC (tous clients confondus)

Par impact décroissant :

1. **F-26/F-27 — Notifications de péremption** (Haute au CDC, US-11) : rien nulle part, et il manque le backend (job CRON + FCM/Web Push, HTTPS requis). C'est **le principal écart de conformité**. Mitigation possible pour la soutenance : notifications **locales** mobile (NOTIF-1 du ROADMAP) qui satisfont l'esprit de l'US-11 sans backend push.
2. **F-52 — Temps réel liste de courses** : pas de WebSocket/SSE (risque assumé au CDC §8.1) ; le rafraîchissement par pull + la file offline mobile en tiennent lieu.
3. **F-25 — Date d'ouverture d'un produit** : donnée « durée entamé » présente en base mais non exploitée par les UIs.
4. **F-17/F-18 — Filtre catégorie & tri quantité** : petits trous d'inventaire des deux côtés (le CDC les annonce « Développé/Partiel » côté web — à re-vérifier ou combler, c'est peu coûteux).
5. **F-47/F-48 — Granularité semaine & budget par catégorie avec alerte** : partiels côté web.
6. **Non-fonctionnels** : refresh token « prévu » au CDC §4.2 mais absent (le 401→logout des deux clients est cohérent avec l'état réel) ; i18n « prévu pour » mais tout est en FR en dur des deux côtés ; perf/pagination OK à l'échelle CDC (500 produits).

## 4. Parité mobile vs web (au-delà du CDC)

Ce que le **mobile n'a pas encore** par rapport au backoffice web — déjà planifié dans `mobile/ROADMAP.md` :

| Domaine | Écart mobile | ROADMAP mobile |
|---------|--------------|----------------|
| Foyer & membres | Tout (création, invitations, rôles, switch multi-foyer) | Epic I + TECH-2 (Phase 1/2) |
| Recettes | Tout (suggestions anti-gaspi, détail, favoris, cuisson, historique) | Epic G (Phase 2) |
| Dépenses & budgets | Tout (CRUD, split, balances, règlements, budgets, audit) | Epic H (Phase 2) |
| Statistiques | Affichage (KPIs, graphiques, export) — les données sont déjà alimentées par les motifs de retrait | Epic J + HOME-8 (Phase 2) |
| OCR ticket | Scan, correction, ajout en masse, historique | SCAN-7/8/9 (Phase 1+) |
| Reset password | Page/deep link de réinitialisation | AUTH-9 + DEEP-LINK (Phase 2) |
| Divers | Tri par quantité, filtre catégorie inventaire | petits tickets (cf. F-17/F-18) |

Ce que le **mobile apporte en plus** du web : scanner code-barre natif plein écran avec fallback saisie manuelle, cochage de courses **hors ligne** avec resynchronisation, thème sombre persisté, URL de backend configurable dans l'app, haptique.

## 5. Recommandations (soutenance du 6 juillet 2026)

1. **Présenter la conformité comme suit** : 100 % des Must Have livrés (web), tous les Should sauf push, tous les Could sauf offline-lecture, et un Won't Have (app mobile) **livré en bonus** — c'est le message le plus fort de la soutenance.
2. Assumer l'écart F-26 (push) en s'appuyant sur la contrainte HTTPS/FCM documentée au CDC §8.1, avec NOTIF-1 (notifications locales mobile) comme plan de suivi.
3. Si un créneau de dev reste : combler F-17 (filtre catégorie) et F-18 (tri quantité) côté mobile — deux petits tickets qui alignent l'inventaire sur la lettre du CDC.
4. Garder ce document à jour en même temps que `mobile/ROADMAP.md`.
