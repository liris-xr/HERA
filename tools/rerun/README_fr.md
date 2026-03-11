# RERUN - Replay du Suivi des Données Utilisateur

## Introduction

L'objectif de ce fichier est de vous aider à configurer et utiliser le script de relecture du suivi des données utilisateur.

Le fichier `/tools/rerun` contient l'unique script nécessaire pour rejouer ce qu'un utilisateur a fait pendant une présentation, en utilisant les données enregistrées dans `databaseRecords`.

## Installation

### Prérequis

Pour utiliser cet outil, vous aurez besoin de :
- Un ordinateur avec une instance Hera (Voir la documentation README.md à la racine du dépôt GitHub)
- Python (https://www.python.org/downloads/) installé sur votre ordinateur (utilisez une version inférieure à 3.14)
- Un IDE utilisant le SDK Python (Recommandé : [Visual Studio Code](https://code.visualstudio.com/download) ou [WebStorm](https://www.jetbrains.com/webstorm/))

### Rerun

Rerun est un outil de visualisation de données pour le développement (Vision par Ordinateur, Robotique, 3D). Il est utilisé ici pour enregistrer les données de session de Réalité Augmentée (position de la caméra, orientation, placement des objets) et les "rejouer" hors ligne après la présentation.

#### Installation

1. **Installer le SDK Rerun**

Ouvrez un CMD :
```shell
pip install rerun-sdk
```

2. Trouver l'emplacement de Rerun

Copiez le chemin d'installation des scripts Rerun :

Sur Windows :
```shell
pip show rerun-sdk | Select-String "Location:"
```

Sur Linux, macOs :
```shell
pip show rerun-sdk | grep "Location:"
```

Note : Le dossier cible est généralement cet emplacement + \Scripts.

3. Créer une variable d'environnement

Sur Windows :
- Appuyez sur la touche Windows, tapez "env", et sélectionnez Modifier les variables d'environnement système.
- Cliquez sur le bouton Variables d'environnement... en bas à droite.
- Dans la section du haut (Variables utilisateur pour [VotreNom]), trouvez et sélectionnez la variable nommée "Path".
- Cliquez sur Modifier....
- Cliquez sur Nouveau à droite.
- Collez le chemin complet vers votre dossier Scripts (celui trouvé à l'étape 2).
- Cliquez sur OK sur toutes les fenêtres pour les fermer.
- Redémarrez tous vos terminaux (PowerShell, CMD, IDE) pour prendre en compte les changements.

Sur Linux :
- Tapez cette commande :
```shell
nano ~/.bashrc
```
- Ajoutez cette ligne à la fin du fichier (remplacez `YOUR_PATH` par le résultat de l'étape 2) :
```shell
export PATH="$PATH:YOUR_PATH"
```
- Redémarrez tous vos terminaux (CMD, IDE) pour prendre en compte les changements.

Sur macOs :
- Tapez cette commande :
```shell
nano ~/.zshrc
```
- Ajoutez cette ligne à la fin du fichier (remplacez `YOUR_PATH` par le résultat de l'étape 2) :
```shell
export PATH="$PATH:YOUR_PATH"
```
- Redémarrez tous vos terminaux (CMD, IDE) pour prendre en compte les changements.

4. Lancer Rerun

Entrez simplement la commande suivante dans un terminal :
```shell
rerun
```

5. Script de Replay
- Allez dans votre IDE et lancez le script `UserTrackingReplay`.
- Changez `rawDbPath`, `rawRecordDbPath`, `rawBaseAssetPath` pour faire correspondre au chemin des fichiers de BD et du dossier des assets.
- Ouvrez `databaseRecords` et récuperer l'ID de la scene et du user dont vous voulez le replay
- Executez le script

6. Configuration de Rerun

Une fois le script lancé, une nouvelle fenêtre s'ouvrira dans le visualiseur Rerun.
- En bas de la fenêtre du visualiseur, changez `log_time` pour `stable_time`
![SetTimeRerun.png](readme/SetTimeRerun.png)


- Au centre gauche de la fenêtre, faites un clic droit sur `user_camera` et cliquez sur `set as eye tracked`
![SetCameraRerun.png](readme/SetCameraRerun.png)