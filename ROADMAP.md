# 🗂️ Roadmap MySmartFridge — Suivi Trello

> Export du board Trello converti en Markdown.
> Légende : ✅ Terminé · 🟠 En cours · ⬜ À faire

---

## 📌 Infos projet

- 🎯 **Date de soutenance : 6 Juillet**
- 📊 Répartition des tickets : **30 prio haute**, **16 prio moyenne**, **7 prio basse**
- ✔️ Tickets réalisés au moment de l'export : **11** (10 prio haute + 1 prio moyenne)

---

## 📈 Vue d'ensemble

| Colonne | Total | ✅ Terminé | 🟠 En cours | ⬜ À faire |
|---------|:-----:|:---------:|:----------:|:---------:|
| Initialisation Projet | 9 | 9 | 0 | 0 |
| Ticketing (backlog) | 39 | 30 | 0 | 9 |
| Sprint (1 semaine) | 2 | 1 | 0 | 1 |
| Hugo | 6 | 6 | 0 | 0 |
| Omar | 9 | 9 | 0 | 0 |
| Maëva | 8 | 8 | 0 | 0 |
| Marketing - Communication | 2 | 0 | 0 | 2 |

> *Les cartes informatives de la colonne « Initialisation » (compteurs de tickets, date de soutenance) ne sont pas comptées comme des tâches.*

---

## 🚀 Initialisation Projet

- ✅ 1 - VERSIONING : Repository → GitHub
- ✅ 2 - CANAL : Partage documentation → Notion
- ✅ 3 - TICKETING : Gestion des tâches → Trello
- ✅ 4 - CANAL : Échanges → Discord
- ✅ 5 - Rédaction du README
- ✅ 6 - MCD
- ✅ 7 - Documentation API
- ✅ 8 - User Stories
- ✅ 9 - Cahier des charges

---

## 📋 Ticketing (Backlog produit)

### ✅ Terminé
- ✅ Badge rouge sur les produits déjà périmés

### ⬜ À faire

**Scan de tickets / OCR**
- ⬜ Importer une photo de ticket (galerie ou caméra)
- ⬜ OCR - extraction automatique des produits et prix
- ⬜ Extraction du montant total du ticket
- ⬜ Écran de confirmation et correction avant ajout
- ⬜ Ajout en masse des produits confirmés
- ⬜ Historique des tickets scannés

**Produits & inventaire**
- ⬜ Scanner un code-barre pour pré-remplir le formulaire
- ✅ Estimer automatiquement la péremption (configurable)
- ✅ Trier par date de péremption / nom / quantité
- ✅ Afficher une photo pour chaque produit

**Recettes**
- ✅ Suggestions de recettes selon les produits disponibles
- ✅ Affichage du détail d'une recette avec photo et étapes
- ✅ Indication des ingrédients disponibles vs manquants
- ✅ Priorité aux produits proches de la péremption (anti-gaspi)
- ✅ Décrémenter les stocks utilisés quand une recette est effectuée
- ✅ Filtres (végétarien, sans gluten, temps de préparation)
- ✅ Sauvegarder une recette en favoris
- ✅ Historique des recettes cuisinées

**Dépenses & budget partagé**
- ✅ Enregistrer une dépense et l'associer à un ticket *(enregistrement fait ; lien vers un ticket scanné à venir avec l'OCR)*
- ✅ Répartir les coûts entre les membres du foyer (split)
- ✅ Tableau de bord des soldes (qui doit combien à qui)
- ✅ Marquer une dette comme remboursée
- ✅ Historique des dépenses par période (semaine/mois)
- ✅ Budget mensuel par catégorie avec alerte de dépassement
- ✅ Total dépensé par période, catégorie et membre

**Listes de courses**
- ✅ Créer et gérer des listes de courses partagées
- ✅ Ajouter des articles manuellement ou depuis l'inventaire
- ✅ Cocher les articles achetés et les transférer en stock

**Foyer & collaboration**
- ✅ Retirer un membre ou quitter un foyer
- ✅ Appartenir à plusieurs foyers et switcher
- ⬜ Synchronisation temps réel entre membres du foyer
- ✅ Upload d'avatar

**Compte utilisateur**
- ✅ Consultation et modification du profil *(infos + changement de mot de passe)*
- ✅ Réinitialisation du mot de passe par email

**Notifications**
- ⬜ Résumé quotidien des produits à risque par email / push

**Statistiques & export**
- ✅ Taux de gaspillage (produits périmés / jetés)
- ✅ Graphiques de consommation (camembert, barres)
- ✅ Export CSV des données

---

## ⏱️ SPRINT - 1 semaine

- ⬜ Importer une photo de ticket (galerie ou caméra)
- ✅ Gérer les rôles (admin, editor, viewer)

---

## 👤 Hugo

- ✅ Création du MCD
- ✅ Ajouter un produit manuellement (nom, quantité, unité, péremption)
- ✅ Modifier un produit existant
- ✅ Supprimer un produit
- ✅ Rechercher un produit par nom
- ✅ Affecter un produit à une catégorie

---

## 👤 Omar

- ✅ Documentation API
- ✅ Inscription avec email / mot de passe
- ✅ Connexion et génération de token JWT
- ✅ Déconnexion et invalidation du token
- ✅ Afficher les produits bientôt périmés
- ✅ Filtrer par emplacement et catégorie
- ✅ Code couleur selon urgence : rouge / orange / jaune
- ✅ Inviter des membres par email ou lien
- ✅ Créer un foyer et en devenir admin

---

## 👤 Maëva

- ✅ Créer / modifier / supprimer un emplacement personnalisé
- ✅ Créer le repo + Docker
- ✅ User Story (Fonctionnalités de l'app)
- ✅ Faire le cahier des charges
- ✅ Créer les tickets
- ✅ Mettre à jour la BDD à l'aide du MCD (30 tables)
- ✅ Insérer des données dans les tables de la BDD
- ✅ Brancher les données mockées aux controllers pour les remonter dans le front

---

## 📣 Marketing - Communication

- ⬜ Nom de l'application
- ⬜ Veille sur la concurrence
