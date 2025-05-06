
#ifndef _FILES_H
#define _FILES_H

#include <string>

//! verifie l'existance d'un fichier.
bool exists( const std::string& filename );

//! renvoie la date de la derniere modification d'un fichier
size_t timestamp( const std::string& filename );

/*! renvoie le chemin d'acces a un fichier. le chemin est toujours termine par /
    pathname("path\to\file") == "path/to/"
    pathname("path\to/file") == "path/to/"
    pathname("path/to/file") == "path/to/"
    pathname("file") == "./"
 */
std::string pathname( const std::string& filename );

//! remplace tous les separateurs par / (linux) ou \ (windows)
std::string normalize_filename( const std::string& filename );

/*! renvoie un nom de fichier relatif a un chemin.
    relative_pathname("textures/base.png", "textures") == "base.png"
    relative_pathname("base.png", "textures") == "base.png"
*/
std::string relative_filename( const std::string& filename, const std::string& path );

#endif
