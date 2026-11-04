# Mots croisés

Application web de mots croisés en français, pensée pour la tablette. Pas de compte ni de serveur :
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

- Grilles générées à la demande (4 niveaux) + **grille du jour** (la même pour tout le monde).
- Toucher une case pour la sélectionner, la toucher à nouveau pour changer de sens (horizontal / vertical).
  Toucher une définition sélectionne le mot.
- **Zoom** : pincer à deux doigts, glisser pour déplacer, boutons − / ajuster / +.
- **Clavier** intégré (AZERTY, QWERTY ou alphabétique) et clavier physique
  (flèches, Tab, Espace pour changer de sens, Ctrl+Z / Ctrl+Y).
- **Stylet** : écrire directement dans une case de la grille, ou dans le cadre de l'onglet *Stylo*.
  Si une lettre est mal lue, toucher la bonne proposition : l'app apprend votre écriture.
- Annuler / rétablir sans limite, effacer une case, un mot ou la grille.
- **Mode crayon** pour les lettres incertaines (affichées en gris).
- Aide : vérifier ou révéler une case, un mot ou la grille.
- Chrono, pause, historique des parties, statistiques et records par niveau, série de grilles du jour.
- Export / import des données (fichier JSON) pour changer d'appareil.

## Dictionnaire

- `js/dico.js` : ~640 mots avec des définitions écrites à la main (prioritaires).
- `js/dico-wiki.js` : plusieurs milliers de mots courants avec une définition tirée du
  [Wiktionnaire](https://fr.wiktionary.org) (licence CC BY-SA 4.0). Régénérer avec :

  ```bash
  python tools/build_dico.py --top 20000
  ```

  Les niveaux faciles n'utilisent que les mots les plus fréquents du français.
