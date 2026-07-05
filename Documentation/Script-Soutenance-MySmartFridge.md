# 🎤 Script de soutenance — MySmartFridge

> **Format :** 25 min de présentation + 5 min de questions · **Date :** 6 juillet 2026
> **Support :** `Soutenance-MySmartFridge.html` (← → pour naviguer, `F` plein écran)
> **Objectif de minutage :** ~24 min pour garder une marge.

**Répartition des orateurs (modifiable) :**
- 🔵 **Omar** — introduction (1→6) & cœur technique (14→17)
- 🟦 **Hugo** — le produit / les fonctionnalités (7→10)
- 🟠 **Maëva** — besoin & conception (11→13) & gestion de projet (18→20)
- Bilan (21→24) — à tour de rôle

> 💡 Le script se lit comme on parle : ce sont des repères, pas un texte à réciter mot pour mot. Regardez le jury, pas vos notes.

---

## 🔵 Bloc 1 — Introduction *(Omar · ~5 min)*

### Slide 1 — Titre *(~30 s)*
Bonjour, nous sommes Omar, Maëva et Hugo, en B3 Informatique option Développement. On vous présente **MySmartFridge**, notre projet fil rouge : une application de **gestion intelligente des stocks alimentaires**, avec une partie **web** et une partie **mobile**.

### Slide 2 — Au programme *(~30 s)*
Voici le déroulé : on commence par le **projet** (le pourquoi), puis on vous montre le **produit** et ses fonctionnalités, ensuite la **conception** et la **technique**, la **gestion de projet**, et on finit par le **bilan** et ce qu'il reste à faire.

### Slide 3 — Contexte & enjeu *(~1 min 15)*
Le point de départ, c'est un constat simple : à la maison, on gère mal ses aliments. On oublie des produits au fond du frigo, on ne suit pas les dates de péremption — et au final, **on jette**. En France, on parle d'environ **30 kg de nourriture par personne et par an**. Les applis qui existent sont soit trop compliquées, soit faites pour une seule personne, alors qu'un frigo, c'est souvent **partagé** — coloc, famille. C'est de là qu'est né MySmartFridge.

### Slide 4 — Les objectifs *(~1 min)*
On s'est fixé sept objectifs. Les principaux : **réduire le gaspillage** en suivant les péremptions, **simplifier l'inventaire** du frigo, du congélateur et des placards, et **automatiser l'ajout** de produits — parce que saisir à la main, personne ne le fait. À ça s'ajoutent les **recettes** anti-gaspi, la **gestion à plusieurs** dans un même foyer, le **partage des dépenses** façon Splitwise, et des **statistiques**.

### Slide 5 — Deux applications à livrer *(~1 min)*
Notre périmètre, c'est **deux applications** : une **application web** en React, responsive, qui est le back-office complet, et une **application mobile** en Flutter, pensée pour les usages en déplacement — scanner un code-barres, cocher sa liste de courses en magasin. Les deux s'appuient sur **la même API**. Ce qu'on a laissé de côté volontairement : la reconnaissance d'image par IA et l'intégration avec des livreurs.

### Slide 6 — Qui a fait quoi *(~45 s)*
On était trois. **Moi, Omar**, j'ai fait le backend, l'authentification, l'API et une bonne partie du mobile. **Maëva** a géré le Docker, le front web et le mobile. **Hugo** a fait la base de données, du backend et du mobile. Et l'**application mobile**, on l'a construite **à trois**. Côté organisation : GitHub, Trello, Discord et Notion.

> ↪ **Transition :** « Hugo va vous montrer concrètement ce que fait l'application. »

---

## 🟦 Bloc 2 — Le produit *(Hugo · ~5 min)*

### Slide 7 — Vue d'ensemble *(~1 min)*
Concrètement, l'application couvre **neuf domaines** : l'inventaire, les péremptions, le scan, les recettes, les dépenses, les courses, les statistiques et le foyer. Je vais m'arrêter sur les trois qui font vraiment la différence.

### Slide 8 — Péremptions & anti-gaspillage *(~1 min 30)*
C'est le cœur du projet. L'appli détecte les produits **bientôt périmés** — on peut filtrer à 3, 7, 14 ou 30 jours. Chaque produit a un **code couleur** selon l'urgence : rouge, orange, jaune. Mieux : quand on ajoute un produit, l'appli **estime automatiquement** sa date de péremption selon sa catégorie, donc on n'a pas à la saisir. Et les recettes proposées mettent en avant les produits qui périment bientôt — pour les cuisiner avant de les jeter.

### Slide 9 — L'ajout rapide *(~1 min 15)*
Pour ajouter un produit, deux façons rapides. Le **code-barres** : on scanne, et l'appli pré-remplit le nom, la marque et la photo via Open Food Facts. Et le **ticket de caisse** : on prend le ticket en photo, un **OCR** lit les produits, les prix et le total. Comme l'OCR n'est pas parfait, on a mis un **écran de confirmation** pour corriger avant de valider, puis on ajoute tout d'un coup.

### Slide 10 — Le foyer partagé *(~1 min 15)*
Tout ça se partage dans un **foyer**. On invite des membres par mail ou par lien, avec des **rôles** — propriétaire, admin, éditeur, lecteur. On peut **répartir les dépenses** entre membres et voir qui doit combien à qui. Et la **liste de courses** est commune : on coche ce qu'on achète, et d'un geste ça passe dans le stock. Détail sympa : sur mobile, cocher marche **même sans réseau**, ça se resynchronise après.

> ↪ **Transition :** « Maëva va vous expliquer comment on a cadré et conçu tout ça. »

---

## 🟠 Bloc 3 — Besoin & conception *(Maëva · ~3 min 15)*

### Slide 11 — Expression du besoin *(~1 min 15)*
Avant de coder, on a cadré le besoin. Ça donne **9 grands thèmes**, déclinés en **56 exigences** et **15 user stories**, pour 84 points d'effort. On a priorisé en **MoSCoW** : ce qu'il faut absolument (Must), ce qui est important (Should), ce qui est un plus (Could), et ce qu'on ne fait pas. Dans le « Won't », on a mis ce qui **n'a pas encore été finalisé** — les notifications push et la synchro temps réel — plus ce qui était hors sujet dès le départ.

### Slide 12 — La stack technique *(~1 min)*
Côté technos : le **front web** en React avec Vite et Tailwind. Le **backend** en Node/Express avec Sequelize, du JWT, et Tesseract.js pour l'OCR. La base en **PostgreSQL**. Le **mobile** en Flutter avec Riverpod. On consomme des **API externes** comme Open Food Facts, et tout tourne dans **Docker**.

### Slide 13 — Le modèle de données *(~1 min)*
La base compte **30 tables**, organisées autour de trois entités : l'**utilisateur**, le **foyer** et le **produit**. Autour, tous les domaines : l'inventaire, les recettes, les dépenses, les courses, l'OCR, les notifications, les stats. Le modèle complet est dans le MCD en annexe.

> ↪ **Transition :** « Omar va rentrer dans l'architecture technique. »

---

## 🔵 Bloc 4 — Le cœur technique *(Omar · ~5 min)*

### Slide 14 — Architecture *(~1 min 15)*
L'architecture est **découplée** : deux clients — le web et le mobile — qui parlent à **une seule API REST**. C'est l'API qui porte toute la logique métier et qui accède à la base via l'ORM. L'authentification passe par des **tokens JWT**. Gros avantage : quand on ajoute une fonctionnalité côté serveur, **les deux applis en profitent**.

### Slide 15 — L'API REST *(~1 min)*
L'API expose des ressources sous `/api`, protégées par JWT, avec des réponses toujours au même format. On y trouve tout : l'authentification, les produits et leurs filtres, les produits bientôt périmés, le lookup code-barres, les emplacements, les courses, les foyers, l'OCR, les recettes, les dépenses. Le tout en **architecture MVC** : modèles, contrôleurs, routes, middlewares.

### Slide 16 — Le choix de l'OCR *(~1 min 15)*
Pour l'OCR, on a comparé cinq solutions. Les API cloud comme Google Vision ou GPT-4o sont plus précises, mais **payantes** et **en ligne**. On a choisi **Tesseract.js** : c'est **gratuit**, ça tourne **en local** — donc les tickets ne quittent jamais la machine, question de confidentialité — et ça gère le **français** nativement. Sa précision est plus faible, autour de 70-80 %, mais on la compense avec l'écran de confirmation. Et on a isolé le code pour pouvoir passer à une solution cloud plus tard si besoin.

### Slide 17 — L'application mobile *(~1 min 30)*
L'application mobile fait partie des **livrables exigés**, au même titre que le web. On l'a développée **à trois**, en Flutter, comme client natif de l'API. Elle couvre l'authentification, le tableau de bord, tout l'inventaire, les péremptions, les courses, et un **scanner de code-barres natif**. Côté qualité : `flutter analyze` ne remonte aucun avertissement, et on a **72 tests** automatisés. Ce que le mobile apporte en plus du web : le scanner plein écran, le cochage **hors-ligne**, et un thème sombre.

> ↪ **Transition :** « Maëva va vous parler de comment on a mené le projet. »

---

## 🟠 Bloc 5 — Gestion de projet *(Maëva · ~3 min)*

### Slide 18 — Méthode & outils *(~1 min)*
On a travaillé en **Agile**, avec des sprints et la priorisation MoSCoW. Chaque grand thème était découpé en user stories, elles-mêmes en tickets. Pour l'outillage : **GitHub** pour le code avec une branche par personne, **Trello** pour le backlog et le suivi, **Discord** pour communiquer, et **Notion** pour la doc.

### Slide 19 — Le fil rouge *(~45 s)*
Voici notre timeline. Le projet a été **lancé le 5 janvier**. On a fait une **soutenance intermédiaire le 24 avril** pour un point d'étape. Entre les deux et après, on a enchaîné le socle, le foyer, l'OCR, les recettes, les dépenses et le mobile. Et **aujourd'hui, le 6 juillet**, c'est la soutenance finale.

### Slide 20 — Où en est-on *(~1 min 15)*
Le verdict de conformité. Tout le **Must Have** est livré, sur le web comme sur le mobile. Le **Should** est couvert à part les notifications push. Le **Could** — split, courses, stats, hors-ligne — est là aussi. Et les **deux applications obligatoires**, web et mobile, sont **opérationnelles**. Le principal point restant, c'est le push, qui demande une infrastructure qu'on n'avait pas en local.

> ↪ **Transition :** « On termine avec le bilan. »

---

## Bloc 6 — Bilan *(à tour de rôle · ~3 min)*

### Slide 21 — Réalisations & difficultés *(Hugo · ~1 min)*
Au final : une **application web complète**, une **API solide** avec ses 30 tables, une **application mobile** avec le scanner et le mode hors-ligne, et une **documentation** fournie. Côté difficultés, on retient trois choses : l'arbitrage sur l'**OCR**, la **montée en compétence sur Flutter** à trois, et la **synchro temps réel** des courses qu'on a contournée avec une file hors-ligne.

### Slide 22 — Ce qui reste à faire *(Omar · ~1 min)*
On est lucides sur ce qui manque. Côté fonctionnel : les **notifications de péremption**, la **synchro temps réel**, la **date d'ouverture** d'un produit, et deux petits filtres d'inventaire. Côté mobile, il reste à **porter** les recettes, les dépenses, le foyer multi-membres et les stats. Bonne nouvelle : **l'API et la base gèrent déjà tout ça** — l'essentiel du travail restant, c'est de l'interface mobile.

### Slide 23 — Conclusion *(Maëva · ~45 s)*
Pour conclure : on a livré les **deux applications** attendues, **100 % des fonctionnalités essentielles**, sur une base technique de 30 tables **prête à évoluer**. Le seul vrai manque, les notifications push, dépend d'une infra que notre architecture est déjà prête à accueillir. On a répondu à notre objectif de départ : **une solution complète et collaborative contre le gaspillage**.

### Slide 24 — Merci *(tous · ~20 s)*
Merci de votre attention — on est prêts pour vos questions.

---

## ❓ Questions / réponses anticipées *(5 min)*

**Pourquoi Tesseract.js plutôt qu'une API cloud plus précise ?**
Coût nul, fonctionnement 100 % local (confidentialité des tickets), et support natif du français. On accepte une précision plus faible qu'on compense par un écran de confirmation. Le code est isolé pour migrer vers du cloud si on passe en production.

**Pourquoi les notifications push ne sont pas faites ?**
Elles demandent du HTTPS et une infra type Firebase Cloud Messaging, qu'on n'avait pas en développement local. C'était identifié comme une contrainte dès le cahier des charges. Le plan : d'abord des notifications locales sur mobile, puis du push serveur via FCM et un job planifié.

**Comment gérez-vous la sécurité ?**
Tokens JWT valides 7 jours, mots de passe hachés avec bcrypt, CORS restreint au front, toutes les routes sensibles protégées par un middleware d'authentification, validation des entrées, et suppression logique (soft delete).

**Pourquoi React pour le web ET Flutter pour le mobile, deux technos différentes ?**
Chaque plateforme avec l'outil le plus adapté : React est mûr et rapide pour un back-office web riche ; Flutter nous donne un vrai mobile natif, indispensable pour le scanner de code-barres, les performances et le mode hors-ligne. Les deux partagent la même API, donc pas de logique dupliquée.

**30 tables, ce n'est pas surdimensionné ?**
Non : elles couvrent l'ensemble des domaines fonctionnels, y compris ceux prévus pour la suite (budgets, historiques, audit). Le modèle a été pensé pour supporter les évolutions sans refonte.

**Comment estimez-vous automatiquement la date de péremption ?**
Chaque catégorie de produit a une durée de conservation de référence, au frigo et au congélateur. À l'ajout, on calcule la date estimée à partir de cette durée ; l'utilisateur peut toujours la corriger.

**Comment le mode hors-ligne du mobile fonctionne-t-il ?**
Quand on coche un article sans réseau, l'action est mise dans une **file persistée** localement. Dès que la connexion revient, la file est **rejouée** vers le serveur. Ça évite de perdre des actions faites en magasin.

**Comment vous êtes-vous répartis le travail et géré le versioning à trois ?**
Une branche Git par personne, un board Trello avec une colonne par membre, et Discord pour se coordonner. L'application mobile, plus transverse, a été faite en commun.

---

## ✅ Derniers conseils

- **Répétez au moins une fois en entier**, chrono en main — viser 24 min laisse une marge.
- Préparez les **transitions** (« je passe la parole à… ») : c'est ce qui fait pro.
- Ayez l'appli **lancée en vrai** dans un onglet, au cas où le jury demande une démo.
- Sur une question dont vous n'êtes pas sûr : dites ce que vous savez, et **assumez** ce qui reste à faire (slide 22) — la lucidité est valorisée.
