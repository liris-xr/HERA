
/*! \addtogroup installation

# étape 1 : obtenir les sources

créer un répertoire de travail, puis :

    git clone https://forge.univ-lyon1.fr/Alexandre.Meyer/gkit2light.git


# étape 2 : installer les dépendances

gKit2 utilise 3 librairies : sdl2 et sdl2_image, et glew, il faut les installer avant de pouvoir compiler les exemples. ainsi qu'un utilitaire : premake.

les étapes sont légèrement différentes d'un système à l'autre (et d'un compilateur à l'autre aussi..). une fois les librairies installées, il suffit de générer les projets pour 
votre environnement de développement et compiler les exemples : 
    - visual studio ou code blocks pour windows, 
    - makefile ou code blocks pour linux, 
    - makefile ou xcode pour mac os.

c'est l'outil premake qui permet de créer les projets, et les makefiles, cf [étape 4](#section_premake)

## linux

installez les paquets, si nécessaire (pas la peine au nautibus) : `libsdl2-dev, libsdl2-image-dev, libglew-dev` et `premake4`, ou premke5 s'il est disponible.
par exemple, pour ubuntu et ses variantes :

    sudo apt install libsdl2-dev libsdl2-image-dev libglew-dev premake4


## windows

les librairies et premake5 sont regroupées dans une archive [disponible ici](https://perso.univ-lyon1.fr/jean-claude.iehl/Public/educ/M1IMAGE/extern_mingw_visual.zip).
    - dezippez l'archive dans le répertoire de gKit, vous devez obtenir un répertoire `gkit2light/extern`,
    - copiez `extern/premake5.exe` dans le répertoire de gKit.

## mac os 

les librairies sont disponibles :
    - [sdl2](https://github.com/libsdl-org/SDL/releases), récupérer le fichier SDL2.xxx.dmg
    - [sdl2_image](https://github.com/libsdl-org/SDL_image/releases), récupérer le fichier SDL2_image.xxx.dmg
    - glew n'est pas necessaire sur mac os.

    - copier le contenu des fichiers .dmg dans `/Library/Frameworks`, 
    - copiez [premake](https://premake.github.io/download) dans le répertoire de gKit.

les librairies et premake sont également dispo dans le gestionnaire de paquets [brew](https://brew.sh/). utiliser brew est probablement la solution la plus directe.

# étape 3 : générer les projets

_pourquoi ?_ gkit compile et fonctionne sur linux, windows, mac os, ios, android et meme WebGL. Chaque système dispose de plusieurs compilateurs et environnements 
de travail. Il n'est pas envisageable de créer et de maintenir tous ces projets manuellement. gkit utilise donc un outil : un générateur de projet, ce qui permet de décrire 
les projets une seule fois et c'est l'outil (premake dans ce cas...) qui génère le projet pour votre environnement de travail. 

il faut donc apprendre à générer le projet pour votre environnement de travail, en utilisant premake.

ouvrez un terminal, et naviguez jusqu'au répertoire contenant gKit :
    - windows : cherchez `powershell` ou `windows terminal` dans le menu démarrer
    - linux : `ctrl`-`alt`-`t`, 
    - mac os : cherchez `terminal`
    
_rappel :_ commandes `ls` et `cd` pour naviguer.

## windows + codeblocks

\code
./premake5.exe codeblocks
\endcode

le workspace (groupe de projets) codeblocks ainsi que les projets sont crées dans le répertoire `build/`, ouvrez `build/gKit2light.workspace`.


## windows + visual studio 

pour générer une solution (groupe de projets) visual studio, il suffit de choisir la bonne version :

\code
./premake5.exe vs2019
ou
./premake5.exe vs2022
\endcode

la solution visual studio ainsi que les projets sont crées dans le répertoire `build/`, ouvrez `build/gkit2light.sln`.


## mac os + xcode

\code
./premake5 xcode 
\endcode


## mac os + makefile

\code
./premake5 gmake
\endcode

le `Makefile` se trouve dans le répertoire de base de gKit. 

## linux + makefile

\code
premake4 gmake		// si premake4 est installe dans le système
./premake5 gmake	// si premake5 est copie dans le repertoire de gKit
\endcode

le `Makefile` se trouve dans le répertoire de base de gKit. 

_remarque :_ si premake5 est disponible dans les paquets de votre distribution utilisez-le ! cf `premake5 gmake`


# étape 4 : compilez un exemple {#section_premake}

compilez `tuto7_camera`, par exemple si vous voulez verifiez qu'une application openGL fonctionne.
sinon vous pouvez compiler `base` si vous souhaitez vérifier qu'une application simple fonctionne.

et vérifiez que tout fonctionne.
sous windows, il faudra probablement copier les `dll` dans `gkit2light/bin` la première fois, cf la [FAQ](#FAQ) plus bas.

## utilisation des makefiles

les makefile peuvent générer les versions debug (cf utiliser un debugger comme gdb ou lldb) ou les versions release, plus rapide (2 ou 3 fois, 
interressant pour les projets avec beaucoup de calculs) :
    - `make help`, affiche la liste des projets et les options disponibles,
    - `make tuto7_camera`, compile la version debug de tuto7_camera,
    - `make tuto7_camera config=release`, compile la version release, 64bits, de tuto7_camera,
    - `make tuto7_camera config=debug`, compile la version debug, 64bits, de tuto7_camera,
    - `make tuto7_camera verbose=1`, compile la version debug de tuto7_camera et affiche le détail des commandes exécutées.

les exécutables sont crées dans le répertoire `gkit2light/bin`, pour les exécuter : 

    bin/tuto7_camera
    ou
    bin/base

__remarque :__ gKit charge quelques fichiers au démarrage, il faut l'exécuter depuis le répertoire de base `gKit2light/`, sinon les fichiers ne seront pas correctement
chargés.

# étape 5 : créer un nouveau projet

pour ajouter un nouveau projet, le plus simple est de modifier premake4.lua et de tout re-générer. Il y a 2 solutions :
    - pour un projet simple, avec 1 seul fichier .cpp 
    - pour un projet composé de plusieurs fichiers .cpp


## projet en 1 fichier .cpp

le plus simple est d'ajouter votre fichier .cpp dans le répertoire `projets` et de modifier la liste des projets dans `premake4.lua`:

trouvez cette déclaration dans premake4.lua :

    -- description des projets		
    local projects = {
        "base"
    }

et ajoutez votre fichier, sans l'extension .cpp, par exemple `tp1` :

    local projects = {
        "base",
        "tp1"
    }

et regénérez le projet, cf premake gmake / vs2022 / xcode ...

## projet avec plusieurs fichiers .cpp

ajoutez la description de votre projet à la fin du fichier `premake4.lua`, en supposant que les sources se trouvent dans le répertoire `tp1` :

\code
    project("tp1")              // nom du projet
        language "C++"
        kind "ConsoleApp"       // application standard
        targetdir "bin"         // placer l'executable dans ./bin
        files ( gkit_files )    // compiler les .cpp du repertoire src/gKit
        files { "tp1/*.cpp" }   // compiler les .cpp du repertoire tp1
\endcode

et regénérez le projet, cf premake gmake / vs2022 / xcode ...


# FAQ {#FAQ}

## erreur horrible dans src/gKit/window.cpp 

selon la version glew, le type du dernier paramètre de la fonction window.cpp/debug change, il suffit d'ajouter un `const` 
dans la déclaration du dernier paramètre.

\code
    ligne 230 :
    //! affiche les messages d'erreur opengl. (contexte debug core profile necessaire).
    static
    void GLAPIENTRY debug( GLenum source, GLenum type, unsigned int id, GLenum severity, GLsizei length, const char *message, 
            void *userParam )
\endcode
    
à remplacer par :

\code
    //! affiche les messages d'erreur opengl. (contexte debug core profile necessaire).
    static
    void GLAPIENTRY debug( GLenum source, GLenum type, unsigned int id, GLenum severity, GLsizei length, const char *message, 
            const void *userParam )	//!< const 
\endcode

## erreur lors du link / édition de liens

par défaut les projets essayent de générer la version 32bits des applications, selon votre système, ce n'est pas possible ou obligatoire...
   
## erreurs à l'exécution sous windows, fichiers .dll manquants
    - pour visual studio : copiez le contenu de `extern/visual/bin` dans `gkit2light/bin`
    - pour codeblocks : copiez le contenu de `extern/mingw/bin` dans `gkit2light/bin`

_remarque :_ on doit pouvoir lefaire automatiquement dans le premake4.lua, mais je n'ai pas encore pris le temps de le faire...

## erreur de compilation / windows SDK 
premake ne connait pas la version du windows sdk actuellement installé sur votre machine, par défaut, il génère des projets pour le sdk de base de windows 10. 
si cette version du sdk n'est pas installée et que les exemples ne compilent pas, __pas de panique__ : ouvrez la solution générée, dans visual studio : 
	- ouvrez le solution explorer, 
	- click droit sur solution et choisissez `re-cibler la solution` / `retarget solution`. 
vous pouvez maintenant compiler un projet...


## j'aime pas premake

pour compiler un projet qui utilise gKit, il suffit de compiler tous les fichiers .cpp de `src/gKit` (sans oublier ceux du projet...) et de linker avec GL, GLEW, SDL2, et 
SDL2_image. 

avec `g++`, c'est direct :
\code{bash}
g++ -o tp1 tp1/*.cpp src/gKit/*.cpp -I src/gKit -lGL -lGLEW -lSDL2 -lSDL2_image
tp1
\endcode

il faut aussi indiquer dans quel répertoire se trouvent les fichiers `.h` / les headers, cf `-I src/gKit` dans les options de g++.
si les librairies ne sont pas installées dans le système, il suffit de donner les répertoires avec les options `-L repertoire` et éventuellement `-Wl,-rpath repertoire`

tous les environnements de travail permettent de décrire ces informations, il faut apprendre à le faire...

## vcpkg et visual studio

[vcpkg](https://github.com/microsoft/vcpkg) est un gestionnaire de paquets pour windows qui permet d'installer les librairies pour visual studio (mais pas les autres 
compilateurs...) :

\code{bash}
vcpkg install sdl2 sdl2_image glew --triplet=x64-windows
vcpkg integrate install
\endcode

vcpkg peut installer les librairies dans un répertoire standard de visual studio (cf l'option `integrate`), ce qui permet de compiler et linker sans trop de problemes !

par contre, il faudra modifier `premake4.lua` qui configure la solution avec le répertoire `extern/visual`, il suffit de supprimer les lignes : 
\code
	includedirs { "extern/visual/include" }
	libdirs { "extern/visual/lib" }
\endcode
dans la section `configuration { "windows", "vs*" }`

remplacez également le nom des configuration "debug" et "release" par "Debug" et "Release", quisont reconnues directement par visual studio et vcpkg.

la liste des paquets / librairies / utilitaires est disponible [https://vcpkg.io/en/packages.html](https://vcpkg.io/en/packages.html)

*/

/*

### installation manuelle / avec les dernières versions
    - [glew](http://glew.sourceforge.net/)
    - [sdl2](https://www.libsdl.org/download-2.0.php), section development libraries
    - [sdl2_image](https://www.libsdl.org/projects/SDL_image/), section development libraries
    
plusieurs versions de premake pour visual studio sont disponibles :
    - pour générer des projets Visual Studio :
    [premake 5](http://premake.github.io/download.html), copiez le dans le répertoire des sources de gKit

le plus simple est de créer un sous répertoire, `extern` par exemple dans le répertoire de gKit, et d'y copier les fichiers `.h`, `.dll` et `.lib`. vous devez obtenir 
une structure :

\code
gKit2light/
    premake4/5
    premake4.lua
    
    data/
        shaders/
        ...
    ...
    
    tutos/
    ...
    
    src/
        gKit/
        ...
    
    bin/
        glew32.dll
        SDL2.dll
        SDL2_image.dll
        libjpeg.dll etc
    
    extern/
        mingw/ ou visual/
            bin/
            
            include/
                SDL2/
                    SDL.h
                    SDL_image.h
                    ...
                
                GL/
                    glew.h
                    ...
                
            lib/
                glew32.lib
                SDL2.lib
                SDL2_image.lib
                SDL2_main.lib
                ...
\endcode

il faudra modifier le fichier premake4.lua avec le chemin d'accès à ce répertoire, si vous n'utilisez pas cette solution. cf section premake.

*/
