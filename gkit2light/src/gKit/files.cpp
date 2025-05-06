
#ifndef _MSC_VER
    #include <sys/stat.h>
#else
    #include <sys/types.h>
    #include <sys/stat.h>
#endif

#include <string>
#include <algorithm>

#include "files.h"


//! verifie l'existance d'un fichier.
bool exists( const std::string& filename )
{
#ifndef _MSC_VER
    struct stat info;
    if(stat(filename.c_str(), &info) < 0)
        return false;

    // verifie aussi que c'est bien un fichier standard
    return S_ISREG(info.st_mode);

#else
    struct _stat64 info;
    if(_stat64(filename.c_str(), &info) < 0)
        return false;

    // verifie aussi que c'est bien un fichier standard
    return (info.st_mode & _S_IFREG);
#endif
}

//! renvoie la date de la derniere modification d'un fichier
size_t timestamp( const std::string& filename )
{
#ifndef _MSC_VER
    struct stat info;
    if(stat(filename.c_str(), &info) < 0)
        return 0;

    // verifie aussi que c'est bien un fichier standard
    if(S_ISREG(info.st_mode))
        return size_t(info.st_mtime);

#else
    struct _stat64 info;
    if(_stat64(filename.c_str(), &info) < 0)
        return 0;

    // verifie aussi que c'est bien un fichier standard
    if(info.st_mode & _S_IFREG)
        return size_t(info.st_mtime);
#endif

    return 0;
}


/*! renvoie le chemin d'acces a un fichier. le chemin est toujours termine par /
    pathname("path\to\file") == "path/to/"
    pathname("path\to/file") == "path/to/"
    pathname("path/to/file") == "path/to/"
    pathname("file") == "./"
 */
std::string pathname( const std::string& filename )
{
    std::string path= filename;
#ifndef WIN32
    std::replace(path.begin(), path.end(), '\\', '/');   // linux, macos : remplace les \ par /.
    size_t slash = path.find_last_of( '/' );
    if(slash != std::string::npos)
        return path.substr(0, slash +1); // inclus le slash
    else
        return "./";
#else
    std::replace(path.begin(), path.end(), '/', '\\');   // windows : remplace les / par \.
    size_t slash = path.find_last_of( '\\' );
    if(slash != std::string::npos)
        return path.substr(0, slash +1); // inclus le slash
    else
        return ".\\";
#endif
}

//! remplace tous les separateurs par / (linux) ou \ (windows)
std::string normalize_filename( const std::string& filename )
{
    std::string path= filename;
#ifndef WIN32
    std::replace(path.begin(), path.end(), '\\', '/');   // linux, macos : remplace les \ par /.
#else
    std::replace(path.begin(), path.end(), '/', '\\');   // windows : remplace les / par \.
#endif

    return path;
}


/*! renvoie un nom de fichier relatif a un chemin.
    relative_pathname("textures/base.png", "textures") == "base.png"
    relative_pathname("base.png", "textures") == "base.png"
    relative_pathname("model/textures/base.png", "model/model.obj") == "textures/base.png"
*/
//~ const char *relative_filename( const std::string& filename, const std::string& path )
std::string relative_filename( const std::string& filename, const std::string& path )
{
    std::string relative= pathname(path);
    
    unsigned i= 0;
    while(filename[i] && relative[i] && filename[i] == relative[i]) 
        i++;
    
    return filename.substr(i);
}
