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

- Le bouton **Primes**, dans l'en-tête à côté du niveau, ouvre un parcours de 12 jalons : premiers clients, recrutement, automatisation, contrats, clients réguliers et Domination. Sa pastille compte les primes disponibles. Chaque prime se réclame une seule fois par partie ; le jeu se met en pause pendant la consultation.
- Après la victoire et les 12 primes, des défis alternent contrats, volumes livrés et recettes supplémentaires. Les objectifs augmentent puis sont plafonnés, sans échéance réelle ni série quotidienne obligatoire.
- Les premiers contrats comportent 6 livraisons au palier 1 et 8 au palier 2. Les conditions signées des contrats déjà en cours restent conservées.
- Les appels avancés utilisent le chiffre d'affaires pour leur déblocage. Les volumes signés sont identiques au chargement, au paiement et à l'affichage ; les offres doivent tenir dans le stock et les camions.
- Les bonus de vitesse de Lenny accélèrent les tournées. Les grades légendaires de Fred et Brigitte sont reconnus pour les cycles et les salaires. La Pérennité avance chaque mois joué en phase 3.
- Le marché initial, la rotation et le rafraîchissement payant utilisent le même tirage : contrats du palier jouable, historique de douze clients, respect de la qualité et des capacités. Sous 20 de réputation, de petits contrats LOCAL de palier 1 restent accessibles pour regagner la confiance des clients.
- Un contrat terminé est compté une fois à sa réussite complète. Les bilans sont présentés en file, avec pause, et les pénalités ne se répètent pas après rechargement.
- L'XP conserve l'historique des achats après les pannes ; les rachats ne donnent pas une deuxième prime d'XP. Le plafond du score de marché permet de dépasser un concurrent à 45.
- Les effets promis par la logistique IA, l'énergie renouvelable, les assurances, les garde-fous, le second dépôt et les investissements de notoriété sont reliés aux calculs utilisés. Les prix de formation affichés correspondent au montant payé.
- Un seul sabotage est choisi à la fois ; les types alternent lorsque plusieurs sont possibles. Les événements partagent une réservation et respectent les périodes de grâce. Les probabilités météo et matérielles suivent le temps de jeu accéléré.
- Les explications du tutoriel, du stockage, des salaires, de la victoire et du prestige sont alignées avec les règles.
- Les conseils sont revalidés après leur délai, liés à une commande visible et reportés pendant les fenêtres de gestion. Ils laissent les commandes accessibles et disparaissent lorsque l'action est accomplie. Les explications générales sont espacées de 15 secondes ; les appels et l'aide contextuelle restent prioritaires. L'accueil suspend le jeu jusqu'au bouton « À moi de jouer » ; les conseils ordinaires laissent la partie avancer.

## Sauvegardes et compatibilité

La sauvegarde reste dans `meltdown:save:v23`, sur le navigateur et le domaine où le joueur joue. Aucun compte ni transfert vers un serveur n'est ajouté. Une prévisualisation Vercel possède une sauvegarde distincte du site de production.

Les sauvegardes anciennes sans carrière restent chargeables. La réception d'une prime enregistre immédiatement la prime et la trésorerie ensemble. Les primes ne sont pas comptées comme chiffre d'affaires. Une nouvelle partie remet le parcours à zéro ; les héritages existants continuent à suivre le système de prestige.

La migration `contractRulesV2` adapte uniquement les anciennes cargaisons dont le volume dépassait la capacité structurelle du stock ou du camion : le prix unitaire est recalculé pour conserver la recette promise par livraison. Les échéances, les cibles et les livraisons déjà réalisées restent conservées.

La migration `contractCompletionV2` retrouve les réussites complètes dans la fidélité et préserve les XP historiques dans un bonus fixe. Les événements, appels, bilans de contrats et délais sont sauvegardés sans rejouer leurs pertes. Les gains d'absence et les attributions de prestige sont enregistrés avant versement ; le chargement choisit la plus récente des sauvegardes disponibles. La base de chiffre d'affaires déjà facturée est conservée.

## Vérification

Les règles de carrière, contrats, progression, prestige, personnel, économie, événements et tutoriels disposent de 89 tests de régression dans `tests/`, dont des contrôles sur les définitions réelles des améliorations. Les nouveaux modules sont séparés du composant historique pour faciliter de futurs équilibrages.

Les scénarios navigateur vérifient l'en-tête aux largeurs 320/390/1280, les contrats et leurs bilans, les charges/prêts, les gains d'absence, la reprise d'incidents et les attributions de prestige. La compilation de production passe. Le composant historique conserve une dette de typage et un paquet initial volumineux ; un contrôle TypeScript complet du monolithe n'est pas encore vert.

Les durées d'une partie complète et l'équilibrage à très long terme doivent encore être mesurés auprès de joueurs. Les défis renouvelables étendent la progression ; ils ne remplacent pas des chapitres narratifs supplémentaires.
