# 🧊 MySmartFridge

Application web de gestion intelligente des stocks alimentaires (frigo, congélateur, placard).

---

## ✨ Fonctionnalités

### Gestion des stocks
- Ajout / modification / suppression de produits
- Organisation par emplacement (frigo, congélateur, placard)
- Catégorisation des produits

### Suivi des péremptions
- Enregistrement des dates d’expiration
- Détection des produits bientôt périmés
- Alertes / notifications

### Ajout rapide
- Scan code-barres
- Saisie simplifiée

### Assistance
- Suggestions de recettes
- Génération de liste de courses

---

## 🛠️ Stack technique

| Couche           | Technologie                       |
|------------------|-----------------------------------|
| Backend          | Node.js, Express                  |
| ORM              | Sequelize                         |
| Base de données  | PostgreSQL                        |
| Frontend         | React + Vite                      |
| Auth             | JWT                               |
| Jobs             | node-cron                         |
| Conteneurisation | Docker, Docker Compose            |

---

## 📁 Structure du projet
MySmartFridge/
├── backend/
│ ├── src/
│ │ ├── config/
│ │ ├── controllers/
│ │ ├── middlewares/
│ │ ├── models/
│ │ ├── routes/
│ │ ├── migrations/
│ │ ├── seeders/
│ │ └── index.js
│ ├── .env
│ ├── package.json
│ └── Dockerfile
│
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ ├── services/
│ │ └── main.jsx
│ ├── .env
│ ├── package.json
│ └── Dockerfile
│
├── docker-compose.yml
└── README.md

## 🌐 Variables d’environnement frontend

env:

VITE_API_URL=http://localhost:3001/api

## 🌐 Variables d’environnement backend

env:

DB_HOST=postgres
DB_PORT=5432
DB_NAME=mysmartfridge_dev
DB_USER=mysmartfridge
DB_PASSWORD=mysmartfridge_pwd

### 📜 Commandes sequelize dans Docker 

#### Créer / mettre à jour les tables :
sudo docker compose exec backend npm run db:migrate

#### Annuler une migration :
sudo docker compose exec backend npm run db:migrate:undo

#### Seeders : Insérer les données initiales :
sudo docker compose exec backend npm run db:seed

#### Reset complet de la base :
sudo docker compose exec backend npm run db:reset

### 📜 Scripts Sequelize
"scripts": {
  "db:migrate": "npx sequelize-cli db:migrate",
  "db:migrate:undo": "npx sequelize-cli db:migrate:undo",
  "db:seed": "npx sequelize-cli db:seed:all",
  "db:reset": "npx sequelize-cli db:drop && npx sequelize-cli db:create && npm run db:migrate && npm run db:seed"
}

### 🧠 Rôle des scripts
db:migrate → applique les migrations
db:migrate:undo → annule la dernière migration
db:seed → ajoute des données de test
db:reset → remet la base à zéro

## 🔗 API Endpoints

| Méthode | Endpoint               | Description      |
| ------- | ---------------------- | ---------------- |
| GET     | /api/products          | Liste            |
| POST    | /api/products          | Ajouter          |
| PUT     | /api/products/:id      | Modifier         |
| DELETE  | /api/products/:id      | Supprimer        |
| GET     | /api/locations         | Emplacements     |
| GET     | /api/locations/:id     | Détail + produits |
| POST    | /api/locations         | Ajouter un emplacement |
| PUT     | /api/locations/:id     | Modifier un emplacement |
| DELETE  | /api/locations/:id     | Supprimer un emplacement |
| GET     | /api/categories        | Catégories       |
| GET     | /api/products/expiring | Produits périmés |
| GET     | /api/shopping-lists    | Listes de courses |
| POST    | /api/shopping-lists    | Créer une liste  |
| PUT     | /api/shopping-lists/:id | Renommer une liste |
| DELETE  | /api/shopping-lists/:id | Supprimer une liste |
| POST    | /api/shopping-lists/:id/items | Ajouter un article |
| PUT     | /api/shopping-lists/:id/items/:itemId | Modifier / cocher un article |
| DELETE  | /api/shopping-lists/:id/items/:itemId | Retirer un article |
| POST    | /api/shopping-lists/:id/transfer | Transférer les articles cochés en stock |
| GET     | /api/auth/me           | Profil courant   |
| PUT     | /api/auth/profile      | Modifier son profil |
| PUT     | /api/auth/password     | Changer son mot de passe |

## 🗄️ Naviguer dans la BDD 

### Entrer dans la BDD via docker :
sudo docker compose exec postgres psql -U mysmartfridge -d mysmartfridge_dev

### Commandes postgresql utiles :

- \dt (Voir les tables)
- SELECT * FROM products; (Afficher les données d'une table)
- sudo docker exec -it mysmartfridge_backend npm run db:seed (Pour dump BDD)

### Les tables de la BDD :

 Schema |           Name           | Type  |     Owner     
--------+--------------------------+-------+---------------
 public | audit_logs               | table | mysmartfridge
 public | barcode_cache            | table | mysmartfridge
 public | cooking_history          | table | mysmartfridge
 public | cooking_history_items    | table | mysmartfridge
 public | expense_category_budgets | table | mysmartfridge
 public | expense_splits           | table | mysmartfridge
 public | expenses                 | table | mysmartfridge
 public | favorite_recipes         | table | mysmartfridge
 public | household_invitations    | table | mysmartfridge
 public | household_members        | table | mysmartfridge
 public | households               | table | mysmartfridge
 public | locations                | table | mysmartfridge
 public | monthly_stats_snapshots  | table | mysmartfridge
 public | notif_settings           | table | mysmartfridge
 public | notifications            | table | mysmartfridge
 public | password_resets          | table | mysmartfridge
 public | product_categories       | table | mysmartfridge
 public | product_consumption_logs | table | mysmartfridge
 public | product_tags             | table | mysmartfridge
 public | products                 | table | mysmartfridge
 public | push_tokens              | table | mysmartfridge
 public | receipt_scan_items       | table | mysmartfridge
 public | receipt_scans            | table | mysmartfridge
 public | recipe_ingredients       | table | mysmartfridge
 public | recipe_steps             | table | mysmartfridge
 public | recipes                  | table | mysmartfridge
 public | shopping_items           | table | mysmartfridge
 public | shopping_lists           | table | mysmartfridge
 public | user_sessions            | table | mysmartfridge
 public | users                    | table | mysmartfridge
(30 rows)

mysmartfridge_dev=# 

## 🚀 Lancement avec Docker

### Prérequis
- Docker
- Docker Compose

### Commandes docker utiles 

sudo docker compose up -d --build (Pour build)
sudo docker compose down (Pour éteindre les conteneurs)
sudo docker compose ps (Pour checker les conteneurs en cours de service)
sudo docker compose exec backend sh (Pour lancer un service en particulier)

### Lancer le projet

sudo docker compose up -d --build (La première fois)
docker compose up -d (Les fois suivantes)

### Accès

Frontend : http://localhost:5173
Backend : http://localhost:3001/api
PostgreSQL : localhost:5433

### Comptes de démonstration

# Alice Dupont : 
identifiant : alice@demo.com 
mot de passe : password123
rôle : owner

# Bob Martin :
identifiant : bob@demo.com
mot de passe : password123
rôle : member

1 foyer partagé : Appart Lyon
4 emplacements : Réfrigérateur, Congélateur, Placard, Placard épices
15 produits répartis dans les emplacements
4 recettes : Ratatouille, Omelette aux champignons, Pasta al pomodoro, Poulet rôti
1 liste de courses avec 3 articles
11 catégories système

