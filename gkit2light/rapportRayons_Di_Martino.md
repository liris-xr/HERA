# TP3 - Lancer de rayon

## Introduction

Ce TP étant plus court, j'ai préféré écrire ce rapport sur un README pour expliquer les différentes étapes du projet.

### Code 

Le code se trouve dans *projets/ray.cpp*, le tutos_rayons ayant été repris comme base.
Pour compiler : *make config=release ray*
Pour exécuter : *bin/ray*

## Dome de lumière

Dans un premier temps, seulement le ciel éclairait la scène.
Pour ce faire, lorsqu'on touche un objet, on va envoyer N rayons en testant l'intersection de directions aléatoires
dans une hémisphère dont la normale est celle du point touché.

En appliquant l'estimateur Monte Carlo, on peut obtenir une estimation de l'éclairage reçu par ce point.
En effet, si une direction voit le ciel, on "rajoute" de la lumière, sinon non.

## Vraies sources de lumières 

Dans un second temps, en gardant les directions aléatoires générées sur une hémisphère partant du point touché, on change notre condition.
Si le rayon touche une source de lumière et non plus le ciel : on rajoute de la lumière.

Cependant, il faut beaucoup de rayons pour avoir un résultat satisfaisant : c'est très aléatoire...
On va donc changer de technique : directement faire partir nos rayons de sampling depuis la source de lumière, au lieu d'espérer poliment l'atteindre.

### Initialisation de la source de lumière 

Pour remplacer le dome par une vraie source de lumière, il a fallu réaliser un petit travail avant d'attaquer le sampling.
Une petite classe "**LightSource**" a été créee afin de stoquer les triangles émissifs et leur poids (déterminé par leur taille par rapport à l'aire totale).

Dans tuto_rayons, il y avait déjà un parcours des triangles de la scène afin de les compter.
Dans cette même boucle, j'ai rajouté le remplissage de la structure **LightSource** :

Un premier parcours est réalisé pour connaître l'aire totale de la source de lumière.
Ensuite, un second parcours est réalisé afin de donner à chaque triangle émissif, son poids par rapport à l'aire totale.

### Sampling sur la source de lumière

Maintenant qu'on a nos triangles émissifs et leur poids :
On utilise la **discrete_distribution** de la std, afin de choisir un triangle au hasard, en fonction de son poids.
En effet, si une source est composée de 4 triangles, dont 3 petits et 1 gros, on veut plus de chance de tomber sur le gros triangle.

Une fois le triangle choisi, on veut simplement générer un point aléatoirement sur ce triangle.
Cela se fait assez simplement : si on connaît les 3 points ABC du triangle, on peut, à partir des vecteurs AB et AC,
obtenir avec deux nombres aléatoire (un pour AB, un pour AC), un point aléatoire sur le triangle.
Attention, il ne faut pas que le point "dépasse" du triangle : on divise donc par 2 nos nombres aléatoire ([0,1] -> [0,0.5]).

Une fois le point obtenu, il ne faut pas oublier de le décoller à l'aide de la normale du triangle !

La pdf est assez simplement la suivant : (1/Aire totale de la source) * (1/Nombre de triangle)

### Calcul de la couleur

Maintenant, on a tout ce qu'il nous faut pour calculer la couleur du point :
On obtient la direction de lumière, avec le point samplé sur la lumière et le point d'imapct donc on veut connaître la lumière.
Et on teste s'il y a un autre triangle entre les deux. Si c'est le cas, pas de lumière pour ce sample.

On aura au préalable récupéré la couleur diffuse du point testé.

### Résultats 

L'image obtenu est *render.hdr*. 
Vous pouvez facilement tester avec plus ou moins de rayons par point avec la variable globale **N** définie en haut du code.
Elle est actuellement réglée à 256 rayons.
Le programme prend ~9 secondes à s'exécuter sur ma machine.

Bonnes fêtes !





