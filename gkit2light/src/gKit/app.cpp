
//! \file app.cpp

#include <cstdio>
#include <cstring>

#include "app.h"
#include "glcore.h"


App::App( const int width, const int height, const int major, const int minor, const int samples )
    : m_window(nullptr), m_context(nullptr), sync(true)
{
    m_window= create_window(width, height, major, minor, samples);
    m_context= create_context(m_window);
}

App::~App( )
{
    if(m_context)
        release_context(m_context);
    if(m_window)
        release_window(m_window);
}

void App::vsync_off( )
{
    // desactive vsync pour les mesures de temps
    SDL_GL_SetSwapInterval(0);
    printf("sync + vsync  OFF...\n");
    
    // desactive aussi la synchro cpu / gpu...
    sync= false;
}

int App::run( )
{
    if(init() < 0)
        return -1;
    
    // configure openGL
    glViewport(0, 0, window_width(), window_height());
    
    // gestion des evenements
    while(events(m_window))
    {
        if(prerender() < 0)
            break;
        
        if(render() < 1)
            break;
        
        if(postrender() < 0)
            break;
        
        // presenter le resultat
        SDL_GL_SwapWindow(m_window);
        
        // force openGL a finir d'executer toutes les commandes, 
        // cf https://www.khronos.org/opengl/wiki/Swap_Interval#GPU_vs_CPU_synchronization
        // devrait limiter la consommation sur portable
        if(sync)
            glFinish();
    }
    
    if(quit() < 0)
        return -1;
    
    // tout c'est bien passe...
    return 0;
}
