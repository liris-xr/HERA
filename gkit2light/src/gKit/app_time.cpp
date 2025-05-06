
#include <cstdio>

#include "app_time.h"
#include "texture.h"


AppTime::AppTime( const int width, const int height, const int major, const int minor, const int samples ) 
    : App(width, height, major, minor, samples)
{
    // desactive vsync pour les mesures de temps
    SDL_GL_SetSwapInterval(0);
    printf("[Apptime] vsync OFF...\n");
    
    // requetes pour mesurer le temps gpu
    m_frame= 0;
    glGenQueries(MAX_FRAMES, m_time_query);
    
    // initialise les queries, plus simple pour demarrer 
    for(int i= 0; i < MAX_FRAMES; i++)
    {
        glBeginQuery(GL_TIME_ELAPSED, m_time_query[i]); 
        glEndQuery(GL_TIME_ELAPSED);
    }
    
    // affichage du temps  dans la fenetre
    m_console= create_text();
}

AppTime::~AppTime( )
{
    glDeleteQueries(MAX_FRAMES, m_time_query);
    release_text(m_console);
}

int AppTime::prerender( )
{ 
#ifndef GK_RELEASE
    // verifie que la requete est bien dispo sans attente...
    {
        GLuint ready= GL_FALSE;
        glGetQueryObjectuiv(m_time_query[m_frame], GL_QUERY_RESULT_AVAILABLE, &ready);
        if(ready != GL_TRUE)
            printf("[oops] wait query, frame %d...\n", m_frame);
    }
#endif    
    
    // recupere la mesure precedente...
    m_frame_time= 0;
    glGetQueryObjecti64v(m_time_query[m_frame], GL_QUERY_RESULT, &m_frame_time);
    
    // prepare la mesure de la frame courante...
    glBeginQuery(GL_TIME_ELAPSED, m_time_query[m_frame]);
    
    // mesure le temps d'execution du draw pour le cpu
    // utilise std::chrono pour mesurer le temps cpu 
    m_cpu_start= std::chrono::high_resolution_clock::now();
    
    return update(global_time(), delta_time());
}

int AppTime::postrender( )
{
    m_cpu_stop= std::chrono::high_resolution_clock::now();
    int cpu_time= std::chrono::duration_cast<std::chrono::microseconds>(m_cpu_stop - m_cpu_start).count(); 
    
    glEndQuery(GL_TIME_ELAPSED);
    
    // selectionne une requete pour la frame suivante...
    m_frame= (m_frame + 1) % MAX_FRAMES;
    // les requetes sont gerees en fifo...
    
    // afficher le texte
    clear(m_console);        
    printf(m_console, 0, 1, "cpu  %02dms %03dus", cpu_time / 1000, cpu_time % 1000);
    printf(m_console, 0, 2, "gpu  %02dms %03dus", int(m_frame_time / 1000000), int((m_frame_time / 1000) % 1000));
    
    // affiche le temps dans le terminal 
    //~ printf("cpu  %02dms %03dus    ", cpu_time / 1000, cpu_time % 1000);
    //~ printf("gpu  %02dms %03dus\n", int(m_frame_time/ 1000000), int((m_frame_time / 1000) % 1000));
    
    draw(m_console, window_width(), window_height());
    
    return 0;
}
