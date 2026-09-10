# Meltdown — Frozen Empire

Jeu de gestion incrémental : produire des glaçons, maîtriser la fonte, développer une équipe et des contrats, puis construire une marque jusqu'à la Domination.

## Lancer le jeu

Avec Node.js 22.18 ou plus récent :

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
```

Les tests utilisent le lanceur intégré à Node.js. Le site est une application React/Vite statique, sans serveur de données. La compilation produit `dist/` pour Vercel.

## Progression retravaillée

- Un parcours visible de 12 jalons relie les premiers clients, le recrutement, l'automatisation, les contrats, les clients réguliers et la Domination. Chaque prime se réclame une seule fois par partie.
- Après la victoire et les 12 primes, des défis alternent contrats, volumes livrés et recettes supplémentaires. Les objectifs augmentent puis sont plafonnés, sans échéance réelle ni série quotidienne obligatoire.
- Les premiers contrats comportent 6 livraisons au palier 1 et 8 au palier 2. Les conditions signées des contrats déjà en cours restent conservées.
- Les appels avancés utilisent le chiffre d'affaires pour leur déblocage. Les volumes signés sont identiques au chargement, au paiement et à l'affichage ; les offres doivent tenir dans le stock et les camions.
- Les bonus de vitesse de Lenny accélèrent les tournées. Les grades légendaires de Fred et Brigitte sont reconnus pour les cycles et les salaires. La Pérennité avance chaque mois joué en phase 3.
- Les explications du tutoriel, du stockage, des salaires, de la victoire et du prestige sont alignées avec les règles.

## Sauvegardes et compatibilité

La sauvegarde reste dans `meltdown:save:v23`, sur le navigateur et le domaine où le joueur joue. Aucun compte ni transfert vers un serveur n'est ajouté. Une prévisualisation Vercel possède une sauvegarde distincte du site de production.

Les sauvegardes anciennes sans carrière restent chargeables. La réception d'une prime enregistre immédiatement la prime et la trésorerie ensemble. Les primes ne sont pas comptées comme chiffre d'affaires. Une nouvelle partie remet le parcours à zéro ; les héritages existants continuent à suivre le système de prestige.

La migration `contractRulesV2` adapte uniquement les anciennes cargaisons dont le volume dépassait la capacité structurelle du stock ou du camion : le prix unitaire est recalculé pour conserver la recette promise par livraison. Les échéances, les cibles et les livraisons déjà réalisées restent conservées.

## Vérification

Les règles de carrière, les contrats, les volumes, la vitesse, la progression mensuelle et les grades salariés disposent de tests de régression dans `tests/`. Les nouveaux modules sont séparés du composant historique pour faciliter de futurs équilibrages.

Les durées d'une partie complète et l'équilibrage à très long terme doivent encore être mesurés auprès de joueurs. Les défis renouvelables étendent la progression ; ils ne remplacent pas des chapitres narratifs supplémentaires.
