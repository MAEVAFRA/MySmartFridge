# 🧊 MySmartFridge

Application de gestion intelligente de votre frigo, congélateur et placard.

## ✨ Fonctionnalités

- **Gestion des stocks** — Ajoutez vos produits (frigo, congélateur, placard)
- **Alertes péremption** — Notifications avant expiration
- **Scan code-barres** — Ajout rapide de produits
- **Suggestions recettes** — Basées sur vos stocks
- **Liste de courses** — Générée automatiquement

## 🛠️ Stack technique

| Couche | Technologie |
|--------|-------------|
| **Backend** | Node.js, Express, Sequelize |
| **Base de données** | PostgreSQL |
| **Frontend** | React (PWA) |
| **Notifications** | node-cron, Web Push API |

## 📁 Structure du projet

```
MySmartFridge/
├── backend/
│   └── src/
│       ├── config/         # Configuration BDD, env
│       ├── controllers/    # Logique métier
│       ├── middlewares/    # Auth, validation
│       ├── models/         # Modèles Sequelize
│       ├── routes/         # Routes API
│       └── utils/          # Helpers
├── frontend/
│   └── src/
│       ├── components/     # Composants réutilisables
│       ├── pages/          # Pages de l'app
│       ├── services/       # Appels API
│       └── hooks/          # Custom hooks
├── docs/                   # Documentation
└── docker-compose.yml      # PostgreSQL local
```

## 🚀 Installation

### Prérequis

- Node.js >= 18
- PostgreSQL (ou Docker)
- npm ou yarn

### 1. Cloner le repo et création utilisateur, BDD, droits

```bash
git clone https://github.com/ton-username/MySmartFridge.git
cd MySmartFridge
```

### 2. Lancer la base de données

```bash
docker-compose up -d
```

### 3. Configurer le backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

### 4. Configurer le frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## 📡 API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/products` | Liste des produits |
| POST | `/api/products` | Ajouter un produit |
| PUT | `/api/products/:id` | Modifier un produit |
| DELETE | `/api/products/:id` | Supprimer un produit |
| GET | `/api/locations` | Liste des emplacements |
| GET | `/api/categories` | Liste des catégories |
| GET | `/api/products/expiring` | Produits bientôt périmés |

## 👩‍💻 Auteur

Maeva Hugo Omar — Projet école

## 📄 Licence

MIT
