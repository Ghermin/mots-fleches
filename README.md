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
  Facile n'utilise que ces mots ; les autres niveaux y ajoutent le Wiktionnaire.
- `js/dico-wiki.js` : des milliers de mots avec jusqu'à 3 sens tirés du
  [Wiktionnaire](https://fr.wiktionary.org) (licence CC BY-SA 4.0). Régénérer avec :

  ```bash
  python tools/build_dico.py --top 35000
  ```

  Plus le niveau est élevé, plus les mots rares sont favorisés (Difficile, Expert) et plus les
  définitions du Wiktionnaire remplacent celles écrites à la main.
  Les définitions peu jouables (lettres d'alphabets étrangers, langues régionales, simple
  contexte comme « Dans un télégramme ») sont écartées au chargement.

## Générateur

`js/generator.js` remplit la grille case par case (retour arrière + redémarrages) : la première
ligne et la première colonne alternent définition / lettre, les autres cases-définitions sont
placées au fil du remplissage. Chaque suite de 2 lettres ou plus doit être un mot du dictionnaire
(sans doublon) ; chaque case-définition définit 1 ou 2 mots ; aucune lettre n'est isolée.
Les mots de 2 lettres sont plafonnés (10 par grille, 14 en Facile) ; clore un mot de 2 ou 3 lettres
par une case-définition n'est tenté qu'en dernier recours, et les grilles avec plus de mots longs
sont préférées.
