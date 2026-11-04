/* Dictionnaire : MOT|définition (mots sans accents, en majuscules). */
window.MC = window.MC || {};
(function (MC) {
  'use strict';
  const RAW = `
AIR|On le respire
AMI|Copain fidèle
ANE|Cousin du cheval, réputé têtu
ARC|Arme qui lance des flèches
BAL|Soirée dansante
BAS|Contraire de haut
BEC|Bouche d'oiseau
BOL|Récipient du petit-déjeuner
BUT|Objectif à atteindre
CAP|Pointe de terre qui avance dans la mer
CLE|Elle ouvre la serrure
COL|Passage en montagne
COU|Il relie la tête au tronc
CRI|Éclat de voix
DOS|Partie arrière du corps
EAU|Liquide vital
ELU|Choisi par les électeurs
ETE|Saison chaude
FEE|Elle a une baguette magique
FIL|Il passe dans le chas de l'aiguille
FIN|Le dernier mot du film
GEL|Il transforme l'eau en glace
ILE|Terre entourée d'eau
LAC|Étendue d'eau douce
LIT|Meuble pour dormir
LOI|Règle votée au Parlement
MER|Grande étendue d'eau salée
MIE|Intérieur du pain
MUR|Paroi de maçonnerie
NEZ|Il sert à sentir
NID|Maison d'oiseau
NOM|Il désigne une personne ou une chose
OIE|Volaille au long cou
OUI|Contraire de non
PIC|Sommet pointu
PIN|Conifère des Landes
PRE|Champ d'herbe
PUR|Sans mélange
RAT|Rongeur des égouts
RIZ|Céréale des pays d'Asie
ROI|Il porte la couronne
RUE|Voie de ville
SEL|Il assaisonne
SOL|Plancher, ou note de musique
SUD|Opposé au nord
TAS|Amas, pile
THE|Boisson chaude venue d'Asie
TOI|Pronom de la deuxième personne
VIN|Boisson de la vigne
VUE|Un des cinq sens
ZOO|Parc aux animaux sauvages
OSE|Hardi, audacieux
ART|Peinture, musique ou sculpture
AGE|Nombre d'années vécues
AIL|Condiment à gousses
AME|Principe spirituel
ANS|Ils comptent l'âge
ARA|Grand perroquet coloré
AXE|Ligne autour de laquelle on tourne
BAC|Examen de fin de lycée
BLE|Céréale du boulanger
BOA|Grand serpent, ou écharpe de plumes
CAR|Autocar
CIL|Poil de la paupière
DUO|Morceau à deux voix
ECU|Ancienne monnaie, ou bouclier
EMU|Touché, ébranlé
EPI|Tête du blé
ERE|Longue époque
GAZ|Ni solide ni liquide
GUE|Passage peu profond dans une rivière
IRA|Futur d'aller
LAS|Fatigué
LIS|Fleur royale
LOT|Part tirée au sort
MAI|Mois du muguet
MAL|Contraire de bien
MAT|Fin de partie aux échecs
MOT|Il se trouve dans le dictionnaire
NET|Clair, propre
NUL|Sans valeur
PAS|Enjambée
PEU|Pas beaucoup
PIE|Oiseau bavard noir et blanc
PLI|Marque sur un tissu
POT|Récipient, ou verre entre amis
SAC|Il se porte à l'épaule
SEC|Contraire de mouillé
SOU|Petite pièce d'autrefois
SUR|Certain
TIR|Action de lancer un projectile
TOT|De bonne heure
UNE|Première page du journal
USE|Abîmé par le temps
VAL|Vallée, en poésie
VER|Il vit dans la terre
VIE|Existence
VOL|Trajet en avion
LIE|Dépôt au fond du tonneau
ROC|Bloc de pierre
SAS|Petite pièce entre deux portes
TRI|Sélection, classement
BUS|Transport en commun
KIT|Ensemble à monter soi-même
JUS|On le presse
DIX|Nombre de doigts des deux mains
SIX|Deux fois trois
UNI|D'une seule couleur
FEU|Il brûle dans la cheminée
JEU|Activité pour s'amuser
OEIL|Il sert à voir
ABRI|Lieu protégé
ACTE|Partie d'une pièce de théâtre
AIGU|Accent, ou son perçant
AILE|Elle permet de voler
AIDE|Secours, assistance
AMER|Contraire de sucré
ANGE|Être céleste ailé
AUBE|Lever du jour
BAIN|On le prend dans la baignoire
BANC|Siège de jardin
BEAU|Joli
BETE|Animal, ou sot
BLEU|Couleur du ciel
BOIS|Matière des arbres
BOUE|Terre mouillée
BRAS|Membre supérieur
CAFE|Boisson noire du matin
CAGE|Prison d'oiseau
CAVE|Pièce sous la maison
CERF|Animal des bois aux grands bois
CHAT|Il ronronne
CHEF|Patron de cuisine
CIEL|Il est bleu par beau temps
CINQ|Les doigts d'une main
CLOU|On l'enfonce au marteau
COIN|Angle
CRAN|Courage, audace
DAME|Pièce du jeu d'échecs
DENT|On la brosse
DEUX|Une paire
DIRE|Exprimer par la parole
DOUX|Agréable au toucher
DUNE|Colline de sable
ECHO|Son renvoyé par la montagne
ELAN|Course avant le saut
EPEE|Arme du mousquetaire
ETAT|Nation, ou manière d'être
FAIM|Envie de manger
FARD|Maquillage
FETE|Célébration joyeuse
FIER|Orgueilleux
FILM|On le voit au cinéma
FLOT|Vague
FOIN|Herbe séchée
FOND|Partie la plus basse
FORT|Robuste
FOUR|On y cuit le gâteau
GANT|Vêtement de la main
GARE|Les trains s'y arrêtent
GOUT|Un des cinq sens
GRAS|Contraire de maigre
GRIS|Couleur de la souris
HIER|Le jour d'avant
IDEE|Pensée, trouvaille
JOIE|Grand bonheur
JOUR|Contraire de nuit
JUGE|Il rend la justice
LAIT|Boisson blanche de la vache
LAME|Partie coupante du couteau
LIEN|Ce qui attache
LION|Roi des animaux
LIRE|Parcourir un texte
LOUP|Il hurle à la lune
LUNE|Satellite de la Terre
MAIN|Elle a cinq doigts
MAIS|Céréale aux épis jaunes
MARI|Époux
MIEL|Produit des abeilles
MINE|Gisement, ou bout du crayon
MODE|Tendance du moment
MONT|Grande hauteur
MOTO|Deux-roues à moteur
MUSE|Source d'inspiration
NAGE|Brasse ou crawl
NOIR|Couleur du charbon
NUIT|Contraire de jour
OCRE|Couleur jaune-brun
ONDE|Vague, ou signal radio
ONZE|Dix plus un
ORGE|Céréale de la bière
OURS|Grand mammifère qui hiberne
PAGE|Feuille de livre
PAIN|Baguette ou miche
PAIX|Contraire de guerre
PARC|Grand jardin public
PEAU|Elle recouvre le corps
PERE|Papa
PIED|Il a cinq orteils
PION|Pièce du jeu de dames
PLAT|Sans relief
PNEU|Il chausse la roue
POIS|Petit légume vert et rond
PONT|Il enjambe la rivière
PORC|Cochon
PORT|Les bateaux y accostent
POTE|Copain, familier
PRIX|Coût, ou récompense
PUCE|Insecte sauteur, ou composant électronique
RAME|Aviron, ou train de métro
RIRE|Éclater de joie
RIVE|Bord d'un cours d'eau
ROBE|Vêtement féminin
ROSE|Fleur à épines
ROUE|Elle tourne sous la voiture
SAGE|Raisonnable
SAUT|Bond
SEUL|Sans compagnie
SOIE|Tissu précieux
SOIR|Fin de journée
TETE|Partie haute du corps
THON|Gros poisson en conserve
TIGE|Elle porte la fleur
TOIT|Il couvre la maison
TOUR|Monument de Paris, ou rotation
TROU|Creux
VASE|Récipient à fleurs, ou boue
VENT|Air en mouvement
VERT|Couleur de l'herbe
VOIX|Elle sert à chanter
VRAI|Exact
YEUX|On les ferme pour dormir
ZERO|Rien du tout
OEUF|La poule le pond
ELLE|Pronom féminin
NOTE|Do, ré ou mi
ARME|Fusil ou épée
AVIS|Opinion
BORD|Limite, côté
CAPE|Manteau sans manches
CODE|Ensemble de lois, ou mot de passe
CRUE|Montée des eaux
DATE|Jour précis
DOME|Toit arrondi
FACE|Visage, ou côté de la pièce
FILS|Garçon de ses parents
HALO|Cercle lumineux
ILOT|Petite île
JEAN|Pantalon de toile bleue
KIWI|Fruit vert, ou oiseau néo-zélandais
LAVE|Elle sort du volcan
LOGO|Emblème d'une marque
MAGE|Sorcier, ou roi venu d'Orient
MALT|Orge germée de la bière
MENU|Liste des plats
NAIN|Personnage de Blanche-Neige
PALE|Sans couleur
PAPA|Père
PIPE|Le fumeur la bourre
PIRE|Plus mauvais
POLE|Nord ou Sud
QUAI|Bord de rivière ou de gare
RAGE|Colère violente
RAIL|Il guide le train
RANG|Ligne, ou position
REVE|Il se fait en dormant
RIEN|Pas une chose
ROLE|Personnage de l'acteur
RUSE|Astuce, stratagème
SALE|Pas propre
SEPT|Jours de la semaine
SITE|Lieu, ou page web
SOLO|Seul sur scène
TAXI|Voiture avec chauffeur
TOUT|Contraire de rien
TUBE|Chanson à succès
UNIR|Rassembler
URNE|Boîte du vote
USER|Abîmer à force d'utiliser
VELO|Bicyclette
VOIE|Chemin
VOTE|Choix de l'électeur
ZONE|Région, secteur
ALLO|Mot du téléphone
ETRE|Exister
ORAL|Examen de vive voix
OSER|Avoir l'audace
OTER|Enlever
ETAU|Outil qui serre
SEVE|Elle monte dans l'arbre
TALC|Poudre douce
TAPE|Petite claque
TUTU|Jupe de danseuse
MIDI|Milieu de la journée
LOTO|Jeu de boules numérotées
NUES|Nuages, en poésie
ARBRE|Chêne ou érable
ASTRE|Corps céleste
AVION|Il vole avec des passagers
BIJOU|Bague ou collier
BAGUE|Anneau au doigt
BALLE|Petite sphère du tennis
BARBE|Poils du menton
BATON|Morceau de bois long
CANNE|Bâton de marche
CHIEN|Meilleur ami de l'homme
CLOWN|Il fait rire au cirque
CRABE|Il marche de côté
DANSE|Valse ou tango
ECOLE|On y apprend à lire
EPICE|Poivre ou cannelle
ETANG|Petit lac
FLEUR|Elle éclot au printemps
FORET|Grand espace d'arbres
FRUIT|Pomme ou poire
GLACE|Eau gelée, ou miroir
GRAIN|Petit fruit de céréale
GUEPE|Insecte qui pique
HIVER|Saison froide
HOTEL|On y dort en voyage
IMAGE|Illustration
JAUNE|Couleur du citron
LAPIN|Il aime les carottes
LIVRE|On le lit
MAGIE|Art de l'illusionniste
MAIRE|Il dirige la commune
MARIN|Homme de mer
MELON|Fruit d'été, ou chapeau
METRO|Train souterrain
MONDE|La Terre et ses habitants
MUSEE|On y admire des œuvres
NAPPE|Elle couvre la table
NEIGE|Flocons blancs
NUAGE|Il apporte la pluie
OASIS|Point d'eau dans le désert
OCEAN|Atlantique ou Pacifique
OLIVE|Petit fruit de l'huile
OMBRE|Zone sans soleil
ONCLE|Frère du père ou de la mère
OPERA|Spectacle chanté
ORAGE|Tonnerre et éclairs
PANDA|Ours noir et blanc
PECHE|Fruit, ou loisir au bord de l'eau
PIANO|Instrument à touches
PISTE|Chemin de ski
PLAGE|Sable au bord de la mer
PLUIE|Elle mouille
POIRE|Fruit en forme de goutte
POMME|Fruit croqué par Blanche-Neige
PORTE|On l'ouvre pour entrer
POULE|Elle pond des œufs
RADIO|Elle diffuse des émissions
REINE|Femme du roi
ROBOT|Machine automatique
ROMAN|Récit en prose
ROUGE|Couleur de la tomate
SABLE|On en trouve à la plage
SAPIN|Arbre de Noël
SALON|Pièce où l'on reçoit
SINGE|Il grimpe aux arbres
SOUPE|Potage
SPORT|Activité physique
STYLO|Il sert à écrire
SUCRE|Il adoucit le café
TABLE|Meuble pour manger
TAPIS|Il couvre le sol
TARTE|Dessert à pâte
TASSE|Pour boire le café
TEMPS|Il passe, ou il fait beau
TERRE|Notre planète
TIGRE|Grand félin rayé
TRAIN|Il roule sur des rails
USINE|Lieu de production
VACHE|Elle donne du lait
VALSE|Danse à trois temps
VERRE|On boit dedans
VILLE|Grande agglomération
ZEBRE|Cheval rayé
AIGLE|Rapace royal
AUTRE|Différent
AVRIL|Mois du poisson
ALBUM|Recueil de photos ou de chansons
ANGLE|Coin
ARENE|Lieu des corridas
ATOME|Particule de matière
BARON|Titre de noblesse
BOTTE|Chaussure haute
CADRE|Bordure d'un tableau
CARTE|Plan pour se repérer
COEUR|Organe qui bat
CORDE|Pour sauter ou grimper
CREME|Chantilly ou fraîche
DIVAN|Canapé
DRAME|Tragédie
ECRAN|Télé ou ordinateur
ETAPE|Partie d'un trajet
FABLE|Récit de La Fontaine
FERME|Exploitation agricole
FILET|Pour attraper les poissons
FLUTE|Instrument à vent
FROID|Contraire de chaud
GENOU|Il plie la jambe
GOMME|Elle efface le crayon
GUIDE|Il montre le chemin
HERBE|Elle pousse sur la pelouse
HEROS|Personnage principal
HOMME|Être humain
IDOLE|Star adulée
JOUET|Pour s'amuser
LAINE|Toison du mouton
LAMPE|Elle éclaire
LEVRE|Bord de la bouche
LIGNE|Trait droit
LITRE|Unité de volume
LOUPE|Verre grossissant
MERLE|Oiseau noir au bec jaune
METAL|Fer ou cuivre
MOINE|Religieux du monastère
OSIER|Bois du panier
PAUSE|Moment de repos
PERLE|Joyau de l'huître
PHARE|Il guide les bateaux la nuit
PLUME|Elle couvre l'oiseau
POCHE|Partie du pantalon
POETE|Il écrit des vers
POUCE|Le plus gros doigt
PRIME|Récompense en argent
RADAR|Il détecte les avions
RAYON|Trait de lumière
REGLE|Pour tracer droit
ROCHE|Pierre
ROSEE|Gouttes du matin
SAUCE|Elle accompagne le plat
SERRE|Abri vitré des plantes
STADE|Terrain de sport
TALON|Arrière du pied
TANTE|Sœur de la mère
TITRE|Nom d'un livre
VAGUE|Ondulation de la mer
VOILE|Elle pousse le bateau
WAGON|Voiture de train
YACHT|Bateau de luxe
ZESTE|Écorce de citron
HIBOU|Oiseau de nuit
SAVON|Il mousse
RADIS|Petit légume rose
MARDI|Jour après lundi
FUSEE|Elle part dans l'espace
AIMER|Éprouver de l'amour
AVOIR|Posséder
NOTER|Écrire pour se souvenir
RESTE|Ce qui demeure
TENIR|Garder en main
SALLE|Grande pièce
ARENE|Lieu des corridas
ENTRE|Parmi
OTAGE|Prisonnier d'un ravisseur
ORTIE|Plante qui pique
ROTIR|Cuire au four
SIRE|Titre du roi
ETOILE|Elle brille la nuit
BOUGIE|Elle éclaire le gâteau d'anniversaire
CHAISE|Siège à dossier
CITRON|Agrume acide
CIRQUE|Chapiteau d'acrobates
FRAISE|Fruit rouge du printemps
GARCON|Jeune homme
JARDIN|Potager ou parterre
MOTEUR|Il fait avancer la voiture
MOUTON|Il donne la laine
ORANGE|Agrume, ou couleur
PAPIER|On écrit dessus
PRINCE|Fils du roi
SOLEIL|Étoile qui nous éclaire
TOMATE|Fruit rouge de la salade
VIOLON|Instrument à cordes et archet
ENFANT|Petit garçon ou petite fille
LETTRE|On la poste
MIROIR|Il reflète l'image
RAISIN|Fruit de la vigne
SIRENE|Mi-femme, mi-poisson
SOURIS|Rongeur, ou accessoire d'ordinateur
TIROIR|Il coulisse dans le meuble
TORTUE|Animal lent à carapace
TRESOR|Coffre plein d'or
TULIPE|Fleur des Pays-Bas
OISEAU|Il a des plumes
GATEAU|Pâtisserie d'anniversaire
ANIMAL|Être vivant qui se déplace
BALCON|Terrasse en hauteur
BATEAU|Il flotte
CAMION|Gros véhicule
CANARD|Il fait coin-coin
CASTOR|Bâtisseur de barrages
CERISE|Petit fruit rouge à noyau
CHATON|Bébé chat
CHEVAL|Il galope
COUSIN|Fils de l'oncle
CRAYON|Il a une mine
DESSIN|Illustration au crayon
DRAGON|Monstre qui crache du feu
GIRAFE|Animal au long cou
HUITRE|Coquillage à perle
JAMBON|Charcuterie
LEGUME|Carotte ou poireau
MAISON|Habitation
MARCHE|Lieu de vente en plein air
MOUCHE|Insecte qui bourdonne
NUMERO|Chiffre d'identification
PALAIS|Demeure royale
PIRATE|Bandit des mers
PLANTE|Végétal
POULET|Volaille rôtie
RENARD|Animal rusé à queue rousse
REQUIN|Grand poisson aux dents acérées
ROCHER|Gros bloc de pierre
SALADE|Laitue
STATUE|Sculpture
TENNIS|Sport de raquette
VOYAGE|Déplacement lointain
NAVIRE|Grand bateau
VOLCAN|Montagne qui crache du feu
CARTON|Boîte de déménagement
MOULIN|Il moud le grain
BOUTON|Il ferme la chemise
JOUEUR|Participant d'un match
CHEMIN|Sentier
SOMMET|Point le plus haut
DOUCHE|On se lave dessous
EPONGE|Elle absorbe l'eau
FARINE|Poudre de blé
FOURMI|Insecte travailleur
GLACON|Petit cube gelé
LAITUE|Salade verte
LIMACE|Escargot sans coquille
ORTEIL|Doigt de pied
PIERRE|Caillou
POUMON|Organe de la respiration
SAISON|Printemps ou été
TOMBER|Chuter
VALISE|Bagage
COCHON|Animal rose de la ferme
NOUGAT|Confiserie de Montélimar
PARFUM|Senteur
SAMEDI|Jour avant dimanche
VOLEUR|Il dérobe
BONBON|Friandise sucrée
SOLDAT|Militaire
LUNDI|Premier jour de la semaine
ARTISTE|Peintre ou musicien
DRAPEAU|Emblème national en tissu
RIVIERE|Cours d'eau
DESSERT|Fin du repas sucrée
FENETRE|Elle donne sur l'extérieur
FROMAGE|Camembert ou brie
GUITARE|Instrument à six cordes
OCTOBRE|Dixième mois
POISSON|Il nage avec des nageoires
POMPIER|Il éteint le feu
SERPENT|Reptile sans pattes
TABLEAU|Peinture encadrée
TAMBOUR|Instrument à percussion
THEATRE|Lieu des comédiens
CHAPEAU|Couvre-chef
DOCTEUR|Médecin
FAMILLE|Parents et enfants
PLANETE|Mars ou Vénus
AUTOMNE|Saison des feuilles mortes
ARMOIRE|Meuble de rangement à portes
LUMIERE|Clarté
DAUPHIN|Mammifère marin intelligent
GALAXIE|La Voie lactée en est une
HAMSTER|Petit rongeur de compagnie
JUILLET|Mois de la fête nationale
MANTEAU|Vêtement chaud d'hiver
MOUETTE|Oiseau de mer
SILENCE|Absence de bruit
TAUREAU|Mâle de la vache
VOITURE|Automobile
CUISINE|Pièce où l'on prépare les repas
CHATEAU|Demeure de seigneur
CHEMISE|Vêtement à boutons
CRAVATE|Elle se noue au col
FACTEUR|Il distribue le courrier
HORLOGE|Grande pendule
JOURNAL|Quotidien imprimé
MUSIQUE|Art des sons
PINCEAU|Outil du peintre
VAMPIRE|Il boit du sang la nuit
BALEINE|Plus grand mammifère marin
CAROTTE|Légume orange
CHAMEAU|Animal à deux bosses
COLLINE|Petite montagne
ECHARPE|Elle protège le cou du froid
GRENIER|Pièce sous les toits
LECTURE|Action de lire
PRAIRIE|Étendue d'herbe
DIAMANT|Pierre précieuse très dure
FANTOME|Esprit qui hante
MYSTERE|Énigme
PISCINE|Bassin de natation
ORCHESTRE|Ensemble de musiciens
ECUREUIL|Rongeur roux des arbres
ESCARGOT|Il porte sa maison sur le dos
PAPILLON|Insecte aux ailes colorées
DIMANCHE|Dernier jour de la semaine
ELEPHANT|Pachyderme à trompe
LANTERNE|Lampe portative
PANTALON|Il couvre les jambes
PYRAMIDE|Tombeau de pharaon
SORCIERE|Elle vole sur un balai
TONNERRE|Bruit de l'orage
CHOCOLAT|Douceur de cacao
DENTISTE|Il soigne les dents
HISTOIRE|Récit, ou matière scolaire
VACANCES|Congés
ALPHABET|De A à Z
AQUARIUM|Bassin à poissons
AVENTURE|Péripétie extraordinaire
CAMPAGNE|Contraire de la ville
CARNAVAL|Fête costumée
CHEMINEE|Conduit de fumée
HERISSON|Petit animal à piquants
MONTAGNE|Elle a un sommet
NOVEMBRE|Onzième mois
TRACTEUR|Engin agricole
TRAINEAU|Véhicule sur la neige
PARAPLUIE|Abri portatif contre la pluie
PRINTEMPS|Saison des fleurs
SQUELETTE|Ensemble des os
TELEPHONE|Il sonne
TROMPETTE|Instrument de cuivre
DINOSAURE|Reptile géant disparu
KANGOUROU|Il saute avec une poche
PARACHUTE|Il freine la chute
TOURNESOL|Grande fleur jaune qui suit le soleil
CROCODILE|Reptile aux grandes mâchoires
BOULANGER|Il fait le pain
ORDINATEUR|Machine à calculer et à écrire
GRENOUILLE|Elle coasse
CITROUILLE|Courge d'Halloween
CHAMPIGNON|Cèpe ou girolle
ASTRONAUTE|Voyageur de l'espace
AMIE|Copine fidèle
ARTS|Beaux-…
AVEU|Reconnaissance d'une faute
BAIE|Petit fruit, ou grande fenêtre
BALAI|Il sert à ramasser la poussière
BARQUE|Petit bateau à rames
BIEN|Contraire de mal
BOEUF|Il tire la charrue
BOTTE|Chaussure de pluie
BRISE|Vent léger
BROSSE|Pour les cheveux ou les dents
BRUIT|Son désagréable
CADEAU|Il se trouve sous le sapin
CALME|Tranquille
CANAL|Voie d'eau creusée par l'homme
CANOE|Embarcation légère à pagaie
CARRE|Figure à quatre côtés égaux
CASQUE|Il protège la tête
CHAMP|Terre cultivée
CHANT|Mélodie de la voix
CHAUD|Contraire de froid
CHEMINEE|Conduit de fumée
CHENE|Arbre aux glands
CHOU|Légume de la choucroute
CLAIR|Lumineux, limpide
COQ|Il chante au lever du jour
CORNE|Pointe sur la tête du taureau
COTE|Bord de mer, ou os de la cage thoracique
COUDE|Articulation du bras
COURSE|Compétition de vitesse
CRUCHE|Récipient à anse, ou personne sotte
CUIR|Peau tannée
CYGNE|Oiseau blanc au long cou
DECOR|Toile de fond du théâtre
DINER|Repas du soir
DOIGT|On en compte dix aux mains
DOUZE|Une douzaine
DRAP|Linge du lit
EGOUT|Canalisation sous la ville
ELEVE|Il apprend en classe
EPAULE|Haut du bras
ERREUR|Faute, méprise
ESPOIR|Attente confiante
ETAGE|Niveau d'un immeuble
ETE|Saison chaude
EVIER|On y fait la vaisselle
FARCE|Blague, ou hachis de viande
FAUX|Contraire de vrai
FENTE|Ouverture étroite
FER|Métal, ou outil à repasser
FEUILLE|Elle tombe en automne
FIGUE|Fruit séché de Méditerranée
FLAMME|Langue de feu
FLOCON|Il tombe en hiver
FOLIE|Démence
FOULE|Multitude de gens
FRERE|Fils des mêmes parents
FUMEE|Elle sort de la cheminée
GALET|Caillou poli par la mer
GARE|Station de train
GENOU|On le plie pour s'agenouiller
GLOBE|Sphère, ou planète
GORGE|Elle avale, ou vallée étroite
GRUE|Oiseau échassier, ou engin de chantier
GUEPE|Elle pique en été
HACHE|Outil du bûcheron
HALLE|Marché couvert
HARPE|Instrument à cordes pincées
HOTE|Il reçoit ses invités
HUILE|Olive ou tournesol
IGLOO|Maison de glace
INDICE|Piste pour l'enquêteur
JAMBE|Membre inférieur
JOUE|Partie du visage
JUPE|Vêtement féminin sans jambes
LAINE|Fil du tricot
LANGUE|Elle goûte, ou elle se parle
LARME|Goutte de chagrin
LEGER|Contraire de lourd
LENT|Contraire de rapide
LIERRE|Plante grimpante
LIMON|Dépôt de rivière
LINGE|Draps et serviettes
LIVRE|Ouvrage, ou demi-kilo
LOGE|Petite pièce du concierge ou de l'artiste
LOURD|Contraire de léger
LUTIN|Petit génie farceur
MAGASIN|Boutique
MALLE|Grand coffre de voyage
MARE|Petite étendue d'eau
MARRON|Fruit du marronnier, ou couleur
MASQUE|Il cache le visage
MATIN|Début de journée
MEDAILLE|Récompense du vainqueur
MERE|Maman
MIETTE|Petit morceau de pain
MOTO|Deux-roues motorisé
MOUSSE|Végétal des sous-bois, ou dessert léger
MOUTARDE|Condiment de Dijon
NAPPE|Linge de table
NATURE|Ensemble des êtres et des choses
NEVEU|Fils du frère ou de la sœur
NIECE|Fille du frère ou de la sœur
NOEUD|Il attache la corde
NOIX|Fruit du noyer
NOYAU|Cœur dur de la cerise
OCRE|Terre jaune
ODEUR|Parfum ou puanteur
OGRE|Mangeur d'enfants des contes
ONGLE|On le coupe au bout du doigt
ORDRE|Commandement, ou rangement
OREILLE|Organe de l'ouïe
ORGUE|Instrument de l'église
OSEILLE|Plante acide, ou argent familier
OTARIE|Phoque à oreilles
OUTIL|Marteau ou tournevis
PAILLE|Tige séchée, ou tube pour boire
PANIER|Corbeille à anse
PAON|Oiseau qui fait la roue
PARAPET|Petit mur de protection
PATE|Elle devient pain ou gâteau
PATTE|Jambe d'animal
PAVE|Bloc de pierre de la rue
PELLE|Outil pour creuser
PENTE|Inclinaison du terrain
PERLE|Bille de collier
PIEGE|Il attrape les imprudents
PILE|Batterie, ou côté de la pièce
PLUME|Elle sert à écrire autrefois
POCHE|On y met ses clés
POELE|Ustensile pour frire
POING|Main fermée
POIVRE|Épice noire
PORTAIL|Grande porte du jardin
POT|Pour la confiture
POUDRE|Fine poussière
PRUNE|Fruit violet à noyau
PUITS|On y puise l'eau
QUAI|On y attend le train
RACINE|Partie souterraine de la plante
RADEAU|Embarcation de fortune
RAME|Elle fait avancer la barque
RAYURE|Trait sur le zèbre
RECIT|Histoire racontée
RENNE|Il tire le traîneau du père Noël
RIDEAU|Il se ferme à la fenêtre
ROSEAU|Plante des marais qui plie
ROUTE|Voie pour les voitures
RUCHE|Maison des abeilles
SABOT|Chaussure de bois, ou pied du cheval
SAULE|Arbre pleureur
SCIE|Outil à dents
SEAU|Récipient à anse pour l'eau
SECRET|Ce qu'on ne doit pas dire
SEMAINE|Sept jours
SIESTE|Repos après le déjeuner
SINGE|Primate farceur
SOEUR|Fille des mêmes parents
SOMME|Petit sommeil, ou total
SONNETTE|On l'actionne à la porte
SOUFFLE|Air expiré
SOURCE|Naissance d'un ruisseau
SUCRE|Il sucre le café
TACHE|Salissure
TAILLE|Hauteur, ou ceinture
TAMIS|Il sert à filtrer la farine
TAPIS|Il couvre le parquet
TASSE|Récipient à anse
TENTE|Abri du campeur
TIGE|Elle porte la feuille
TIMBRE|Il s'affranchit sur l'enveloppe
TOILE|Œuvre du peintre, ou tissu
TONNEAU|Barrique
TORCHE|Lampe de poche
TOUPIE|Jouet qui tourne
TRAIT|Ligne tracée
TRESSE|Coiffure en natte
TRIBU|Groupe de familles
TROTTOIR|Il borde la rue
TUILE|Elle couvre le toit
VAISSEAU|Navire, ou veine
VALLEE|Creux entre deux montagnes
VAPEUR|Eau en gaz
VEAU|Petit de la vache
VELOURS|Tissu doux à côtes
VERGER|Jardin d'arbres fruitiers
VESTE|Vêtement à manches
VIANDE|Bœuf ou porc
VIDE|Contraire de plein
VIGNE|Elle donne le raisin
VITRE|Carreau de fenêtre
VITESSE|Rapidité
VOISIN|Il habite à côté
VOLET|Il ferme la fenêtre
ZEBU|Bœuf à bosse
`;
  const seen = new Set();
  const keep = w => /^[A-Z]{2,}$/.test(w.word) && w.clue && !seen.has(w.word) && seen.add(w.word);

  // 1) Mots choisis à la main (rang 0 = définition soignée, prioritaire).
  MC.DICO = RAW.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const k = l.indexOf('|');
      return { word: l.slice(0, k).trim().toUpperCase(), clue: l.slice(k + 1).trim(), r: 0 };
    })
    .filter(keep);
  MC.DICO_CURATED = MC.DICO.length;

  // 2) Dictionnaire étendu tiré du Wiktionnaire (js/dico-wiki.js), si présent.
  //    r = rang de fréquence du mot en français : plus il est petit, plus le mot est courant.
  if (MC.DICO_WIKI) {
    for (const l of MC.DICO_WIKI.split('\n')) {
      const p = l.split('|');
      if (p.length < 3) continue;
      const w = { word: p[0], r: +p[1] || 99999, clue: p.slice(2).join('|').trim() };
      if (keep(w)) MC.DICO.push(w);
    }
  }
})(window.MC);
