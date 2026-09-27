# StudyPlanner AI

Application web destinée aux étudiants pour organiser leurs matières, devoirs, examens, révisions et priorités du jour.

## Objectif du projet

StudyPlanner AI est un projet universitaire qui propose un tableau de bord d’organisation scolaire, entièrement utilisable dans le navigateur, sans serveur. L’objectif est de centraliser le suivi académique : matières, tâches, examens, planning, progression et recommandations automatiques.

## Fonctionnalités

- Tableau de bord avec statistiques automatiques (matières, tâches à faire, tâches terminées, examens à venir)
- Gestion des matières (ajout, modification, suppression, couleur, enseignant facultatif)
- Gestion des devoirs et tâches (types, date limite, priorité, description, statut terminé / en cours)
- Gestion des examens avec calcul automatique des jours restants
- Planning chronologique des éléments à venir
- Smart Planner : recommandations locales selon les échéances, priorités et examens
- Focus du jour : jusqu’à trois tâches recommandées
- Progression globale avec barre et message motivant
- Recherche, filtres (matière, priorité, statut) et tris (date, priorité, matière)
- Données de démonstration au premier lancement
- Bouton de réinitialisation des données avec confirmation
- Sauvegarde persistante via `localStorage`
- Interface en français, responsive et accessible (labels, focus visible, HTML sémantique)

## Technologies utilisées

- HTML5
- CSS3
- JavaScript vanilla (sans framework)
- `localStorage` du navigateur

Aucun backend, aucune base de données distante et aucune dépendance npm ne sont requis.

## Structure des fichiers

```
StudyPlanner AI/
├── index.html    Interface et structure sémantique
├── style.css     Identité visuelle et mise en page responsive
├── script.js     Logique métier, Smart Planner et persistance
└── README.md     Documentation du projet
```

## Procédure pour lancer l’application

1. Télécharger ou copier le dossier `StudyPlanner AI`.
2. Ouvrir le fichier `index.html` avec un navigateur moderne (Chrome, Edge, Firefox ou Safari).
3. Utiliser l’application immédiatement : des données d’exemple sont chargées au premier lancement.

Il n’est pas nécessaire d’installer un logiciel, ni de lancer un serveur local.

## Utilisation de localStorage

Toutes les données (matières, tâches, examens) sont enregistrées dans le stockage local du navigateur, sous la clé `studyplanner-ai-v1`.

- Les informations restent disponibles après fermeture de l’onglet.
- Elles restent propres à ce navigateur et à cet ordinateur.
- Le bouton **Réinitialiser les données** remplace le contenu actuel par un jeu d’exemple (matières, tâches et examens datés par rapport à aujourd’hui).

Le Smart Planner et le Focus du jour relisent ces données à chaque modification : les recommandations se mettent à jour automatiquement.

## Smart Planner

Le Smart Planner n’appelle **aucune API d’intelligence artificielle externe**. Il s’agit d’une logique JavaScript locale fondée sur des règles :

- proximité des examens ;
- tâches en retard ;
- volume de tâches importantes dans la semaine ;
- concentration de tâches sur une même matière ;
- message positif si le planning est sous contrôle.

## Utilisation de Cursor AI

Cursor AI a été utilisé comme assistant de développement pour :

- concevoir la structure du projet ;
- générer une partie du code HTML, CSS et JavaScript ;
- améliorer l’interface et l’expérience utilisateur ;
- implémenter les fonctionnalités demandées (CRUD, filtres, planning, Smart Planner, progression) ;
- relire et corriger le code.

Le résultat reste un projet étudiant : le code est lisible, commentable et modifiable pour le rapport ou une soutenance.
