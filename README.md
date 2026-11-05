# Mots fléchés

Application web de mots fléchés en français, pensée pour la tablette. Pas de compte ni de serveur :
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
- La définition complète du mot en cours s'affiche dans le bandeau (et dans le panneau en paysage).
- **Zoom** : pincer à deux doigts, glisser pour déplacer, boutons − / ajuster / +.
- **Clavier** intégré (AZERTY, QWERTY ou alphabétique) et clavier physique
  (flèches, Tab, Espace pour changer de sens, Ctrl+Z / Ctrl+Y).
- **Stylet** : écrire directement dans une case de la grille, ou dans le cadre de l'onglet *Stylo*.
  Si une lettre est mal lue, toucher la bonne proposition : l'app apprend votre écriture.
- Annuler / rétablir sans limite, effacer une case, un mot ou la grille.
- **Signaler une définition ratée** (drapeau ⚑ à côté de la définition) : le mot est retiré des
  prochaines grilles. La liste se retrouve dans les réglages (rétablir, copier).
- **Mode crayon** pour les lettres incertaines (affichées en gris).
- Aide : vérifier ou révéler une case, un mot ou la grille.
- Chrono, pause, historique des parties, statistiques et records par niveau, série de grilles du jour.
- Export / import des données (fichier JSON) pour changer d'appareil.

## Dictionnaire

- `js/dico.js` : ~870 mots avec des définitions écrites à la main (prioritaires), dont les mots
  de 2 lettres indispensables aux mots fléchés (articles, notes, pronoms…).
  Facile n'utilise que ces mots ; les autres niveaux y ajoutent le Wiktionnaire
  (en pratique ~75 % de mots faits main en Moyen, ~60 % en Expert).
- `js/dico-wiki.js` : plusieurs milliers de mots courants avec une définition tirée du
  [Wiktionnaire](https://fr.wiktionary.org) (licence CC BY-SA 4.0). Régénérer avec :

  ```bash
  python tools/build_dico.py --top 20000
  ```

  Plus le niveau est facile, plus les mots du Wiktionnaire sont limités aux mots courants.
  Les définitions peu jouables (lettres d'alphabets étrangers, langues régionales, simple
  contexte comme « Dans un télégramme ») sont écartées au chargement.

## Générateur

`js/generator.js` remplit la grille case par case (retour arrière + redémarrages) : la première
ligne et la première colonne alternent définition / lettre, les autres cases-définitions sont
placées au fil du remplissage. Chaque suite de 2 lettres ou plus doit être un mot du dictionnaire
(sans doublon) ; chaque case-définition définit 1 ou 2 mots ; aucune lettre n'est isolée.
