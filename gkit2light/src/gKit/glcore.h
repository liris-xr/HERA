
#ifndef _GK_GL3CORE_H

#ifdef GK_MACOS
    #include <OpenGL/gl3.h>

    // pas la peine d'utiliser glew
    #define NO_GLEW

#else
    // windows et linux
    #define GLEW_NO_GLU
    #include "GL/glew.h"

    #ifdef WIN32
    #  ifdef __MINGW32__        // codeblocks
    #    define DEBUGCALLBACK __stdcall
    #  elif defined(_MSC_VER)   // vstudio
    #    define DEBUGCALLBACK 
    #  endif
    #else                       // linux
    #  define DEBUGCALLBACK 
    #endif
#endif

#endif
