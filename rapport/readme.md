# Explications de code, pré-calcul de l'irradiance volume et utilisation des probes

Bonjour !
Ce court document a pour objectif d'indiquer les différentes parties importantes du code.

Vous y trouverez comment utiliser le programme permettant de pré-calculer l'éclairage d'une scène, ainsi que des indications concernant les fichiers principaux à modifier en cas de besoin.

## Pré-calcul

Pour pré-calculer les probes, il faut déjà aller dans la racine de gkit2light
Pour une première utilisation :

- premake4 gmake
- make config=release 
- bin/ray "nom du fichier" "centreX" "centreY" "centreZ" "densité" "tailleX" "tailleY" "tailleZ" "nombre de rayons directs" "nombre de rayons indirect" "nombre de rayons direct envoyé après l'indirect" "taille d'une depthmap" "nombre de rayon par pixel de la depthmap"

Il y a beaucoup de paramètres et je m'en excuse : le main qui regroupe tous les paramètres se trouve dans projets/ray.cpp

Un exemple d'utilisation : 
bin/ray data/wall_test_working.glb 0 1 0 8 2 2 2 32 192 16 16 8

Ici, on a notre volume centré en (0,1,0)
Une densité de 8
Un volume de 2\*2\*2
32 rayons de direct (par probe)
192 rayons d'indirect (pareil)
16 rayons de direct par rayon d'indirect

Des depthmap de 16*16
Où on lance 8 par axe (donc 8*8) rayons pour chaque pixel


### Fichiers générés 

Une fois cette commande lancée, on obtient plusieurs fichiers, tous envoyés dans frontend/admin/public/textures
Voici une brève description de ces derniers :
- sh*.csv infos d'irradiance (chaque fichier contient un coeffcient)
- atlasParameters.json : paramètres de l'atlas d'octmap
- depthMapAtlas.csv : atlas de depth maps
- lpvParamaters.json : paramètres du volume d'irradiance
- shOffset.csv : offset de toutes les probes
- shPositions.csv : positions de toutes les probes (redondant, pas indispensable)
- atlas.png : débug, affiche juste une couche 2D de l'atlas 3D

## Fichiers importants

### Pré-calcul

- projets/ray.cpp : l'éxécutable, regroupe les paramètres et instancie l'irradiance volume
- src/gKit/lightProbeVolume.cpp : gros du code, s'occupe de gérer le pré-calcul des probes et de créer les ficherss
- src/gKit/octahedron.cpp : Permet d'encoder facilement les octmap
- src/gKit/lightProbe.cpp : structure de base d'une probe
- src/gKit/lightSources.cpp : Permet d'enregistrer les sources de lumières d'une scène (les triangles émissifs avec leurs poidss)

### Echantillonnage

Tout se trouve dans frontend/admin/src/js/threeExt/modelManagement/meshManager.js

Le code se divise en deux parties : 

- La partie javascript qui charge les données (uniforms et textures) pour le shader
- Le shader : la pipeline de base de ThreeJS est reprise, d'où tous les includes