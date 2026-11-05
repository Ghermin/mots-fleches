# Mots fléchés

Application web de mots fléchés en français, pour téléphone et tablette. Pas de compte ni de serveur :
tout tourne dans le navigateur, et les parties sont enregistrées sur l'appareil.

## Lancer

```bash
python -m http.server 8765
```

Puis ouvrir http://localhost:8765.

**Sur la tablette :** l'app doit être servie en HTTPS pour s'installer (GitHub Pages, Netlify…).
Une fois ouverte, choisir *Partager → Sur l'écran d'accueil* (iPad) ou *Installer l'application*
(Android). Elle marche ensuite hors-ligne, en plein écran.

## Fonctions

- Grilles pleines générées à la demande (format magazine 10 × 14, 4 niveaux de vocabulaire) + **grille du jour**
  (la même pour tout le monde). Les définitions sont dans les cases, une flèche indique le sens du mot.
- Toucher une case-définition sélectionne son mot (moitié haute ou basse quand elle en contient deux).
  Toucher une lettre la sélectionne, la toucher à nouveau change de sens (horizontal / vertical).
- La définition complète du mot en cours s'affiche en grand dans le bandeau, juste au-dessus du clavier
  (dans le panneau de droite en paysage). Le toucher change de sens ; ‹ › passent au mot précédent / suivant.
- **Zoom** : pincer à deux doigts, glisser pour déplacer, ou la loupe de la barre du haut (zoom sur le mot en cours / grille entière).
- **Clavier** intégré sur 3 rangées (AZERTY, QWERTY ou alphabétique), avec vibration au toucher, et clavier physique
  (flèches, Tab, Espace pour changer de sens, Ctrl+Z / Ctrl+Y). On se déplace en touchant la grille.
- **Aide** (touche du clavier) : vérifier, révéler ou effacer une case, un mot ou la grille, signaler une définition.
- **Brouillon** (touche du clavier) : les lettres tapées sont provisoires (affichées en gris).
- Annuler / rétablir sans limite.
- **Signaler une définition ratée** (menu Aide) : le mot est retiré des
  prochaines grilles. La liste se retrouve dans les réglages (rétablir, copier).
- Chrono, pause, historique des parties, statistiques et records par niveau, série de grilles du jour.
- Export / import des données (fichier JSON) pour changer d'appareil.

## Dictionnaire

- `js/dico.js` : ~900 mots avec des définitions écrites à la main (prioritaires), dont les mots
  de 2 lettres indispensables aux mots fléchés (articles, notes, pronoms…). Les mots les plus
  fréquents dans les grilles ont plusieurs définitions (`MOT|déf. 1|déf. 2`) : chaque grille en
  pioche une, et une même définition n'apparaît jamais deux fois dans une grille.
  Facile y ajoute seulement les 3 000 mots les plus courants du Wiktionnaire dont le sens principal
  est court ; les autres niveaux, davantage de mots du Wiktionnaire.
- `js/dico-wiki.js` : des milliers de mots avec jusqu'à 3 sens tirés du
  [Wiktionnaire](https://fr.wiktionary.org) (licence CC BY-SA 4.0), plus ~12 600 **formes
  accordées et conjuguées** : pluriels et féminins (CHEVAUX, PETITE), verbes à la 3e personne
  (présent, imparfait, futur, passé simple) et au participe (PRENAIT, QUITTEES), tous groupes
  confondus. Les formes et la nature des mots viennent de [Lexique 3.83](http://www.lexique.org)
  (licence CC BY-SA 4.0) ; la définition est accordée de la même façon, mot par mot, d'après
  Lexique (« Prendre la fuite » → « Prenait la fuite ») ; au moindre doute, la forme est écartée.
  Une grille ne contient jamais deux formes du même mot.
- `js/dico-lpc.js` : ~12 700 mots avec de **vraies définitions de mots fléchés**, vérifiées à la
  main, de [La Petite Case](https://www.lapetitecase.fr) (jeux de données
  [mots-fleches-definitions](https://huggingface.co/datasets/lapetitecase/mots-fleches-definitions) et
  [dictionnaire-mots-fleches](https://huggingface.co/datasets/lapetitecase/dictionnaire-mots-fleches),
  licence CC BY 4.0). Elles passent avant celles du Wiktionnaire.

Régénérer les deux fichiers avec :

```bash
python tools/build_dico.py --top 35000
```

(`--offline` pour régénérer depuis le cache `tools/.cache`, sans réseau ; Lexique et les
fichiers de La Petite Case y sont téléchargés au premier lancement.)
Plus le niveau est élevé, plus les mots rares sont favorisés (Difficile, Expert) et plus les
définitions du Wiktionnaire remplacent celles écrites à la main.
Les définitions peu jouables (lettres d'alphabets étrangers, langues régionales, simple
contexte comme « Dans un télégramme ») sont écartées au chargement.

## Générateur

`js/generator.js` remplit la grille case par case (retour arrière + redémarrages) : la première
ligne et la première colonne alternent définition / lettre, les autres cases-définitions sont
placées au fil du remplissage. Chaque suite de 2 lettres ou plus doit être un mot du dictionnaire
(sans doublon) ; chaque case-définition définit 1 ou 2 mots ; aucune lettre n'est isolée.
Les mots de 2 et 3 lettres ne servent qu'à boucher les derniers trous : ils sont plafonnés (6 et 8
par grille, 9 et 10 en Facile, plafonds desserrés d'un cran tous les 10 essais ratés), clore un
mot de 2 ou 3 lettres par une case-définition n'est tenté qu'en dernier recours, et sur 5 grilles
complètes, on garde celle qui a le plus de mots longs. La recherche dure quelques secondes, en
arrière-plan (`js/worker.js`). Environ un mot sur trois fait 2 ou 3 lettres (46 % en Facile),
comme dans les grilles de magazine.
