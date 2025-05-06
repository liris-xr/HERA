
//! \file window.cpp

#include <cassert>
#include <cstdio>
#include <cstdio>
#include <cstring>
#include <cmath>

#include <chrono>
#include <vector>
#include <set>
#include <string>
#include <iostream>

#include "glcore.h"
#include "window.h"
#include "files.h"


static float aspect= 1;

static int width= 0;
static int height= 0;
int window_width( )
{
    return width;
}
int window_height( )
{
    return height;
}

int window_msaa( )
{
    int n= 0;
    SDL_GL_GetAttribute(SDL_GL_MULTISAMPLESAMPLES, &n);
    return n;
}

static std::vector<unsigned char> key_states;
int key_state( const SDL_Keycode key )
{
    SDL_Scancode code= SDL_GetScancodeFromKey(key);
    assert((size_t) code < key_states.size());
    return (int)  key_states[code];
}
void clear_key_state( const SDL_Keycode key )
{
    SDL_Scancode code= SDL_GetScancodeFromKey(key);
    assert((size_t) code < key_states.size());
    key_states[code]= 0;
}

static SDL_KeyboardEvent last_key;
SDL_KeyboardEvent key_event( )
{
    return last_key;
}
void clear_key_event( )
{
    last_key.type= 0;
    last_key.keysym.sym= 0;
}

static SDL_TextInputEvent last_text;
SDL_TextInputEvent text_event( )
{
    return last_text;
}
void clear_text_event( )
{
    last_text.text[0]= 0;
}

static std::vector<std::string> last_drops;
const std::vector<std::string>& drop_events( )
{
    return last_drops;
}

const char *drop_event( )
{
    if(last_drops.empty())
        return nullptr;
    else
        return last_drops.back().c_str();
}

void clear_drop_event( )
{
    last_drops.clear();
}

void clear_drop_events( )
{
    last_drops.clear();
}


static SDL_MouseButtonEvent last_button;
SDL_MouseButtonEvent button_event( )
{
    return last_button;
}
void clear_button_event( )
{
    last_button.state= 0;
}

static SDL_MouseWheelEvent last_wheel;
SDL_MouseWheelEvent wheel_event( )
{
    return last_wheel;
}
void clear_wheel_event( )
{
    last_wheel.x= 0;
    last_wheel.y= 0;
}


//
static std::chrono::high_resolution_clock::time_point app_start= {};
static std::chrono::high_resolution_clock::time_point last_time= {};
static float last_delta= 0;

float global_time( )
{
    std::chrono::high_resolution_clock::time_point now= std::chrono::high_resolution_clock::now();
    last_delta= float(std::chrono::duration_cast<std::chrono::microseconds>(now - last_time).count()) / float(1000);
    last_time= now;
    
    return float(std::chrono::duration_cast<std::chrono::microseconds>(now - app_start).count()) / float(1000);
}

float delta_time( )
{
// pas super utile, a virer ?
    return last_delta;
}

// etat de l'application.
static int stop= 0;

//! boucle de gestion des evenements de l'application.
int run( Window window, int (*draw)() )
{
    // configure openGL
    glViewport(0, 0, width, height);

    // run
    while(events(window))
    {
        // dessiner
        if(draw() < 1)
            stop= 1;    // fermer l'application si draw() renvoie 0 ou -1...
        
        // presenter le resultat
        SDL_GL_SwapWindow(window);
    }

    return 0;
}

static int event_count= 0;
int last_event_count( ) { return event_count; }


int events( Window window )
{
    bool resize_event= false;
    
    // gestion des evenements
    SDL_Event event;
    while(SDL_PollEvent(&event))
    {
        switch(event.type)
        {
            case SDL_WINDOWEVENT:
                // redimensionner la fenetre...
                if(event.window.event == SDL_WINDOWEVENT_RESIZED)
                {
                    // traite l'evenement apres la boucle... 
                    resize_event= true;
                    
                    // conserve les proportions de la fenetre
                    width= event.window.data1;
                    height= event.window.data2;
                }
                break;
            
            case SDL_DROPFILE:
                //~ printf("drop file '%s'\n", event.drop.file);
                last_drops.push_back(std::string(event.drop.file));
                SDL_free(event.drop.file);
                break;
            
            case SDL_TEXTINPUT:
                // conserver le dernier caractere
                last_text= event.text;
                break;
            
            case SDL_KEYDOWN:
                // modifier l'etat du clavier
                if((size_t) event.key.keysym.scancode < key_states.size())
                {
                    key_states[event.key.keysym.scancode]= 1;
                    last_key= event.key;    // conserver le dernier evenement
                }
                
                // fermer l'application
                if(event.key.keysym.sym == SDLK_ESCAPE)
                    stop= 1;
                break;
            
            case SDL_KEYUP:
                // modifier l'etat du clavier
                if((size_t) event.key.keysym.scancode < key_states.size())
                {
                    key_states[event.key.keysym.scancode]= 0;
                    last_key= event.key;    // conserver le dernier evenement
                }
                break;
            
            case SDL_MOUSEBUTTONDOWN:
            case SDL_MOUSEBUTTONUP:
                last_button= event.button;
                break;
            
            case SDL_MOUSEWHEEL:
                last_wheel= event.wheel;
                break;
            
            case SDL_QUIT:
                stop= 1;            // fermer l'application
                break;
        }
    }

    if(resize_event)
    {
        int w= std::floor(height * aspect);
        int h= height;
        SDL_SetWindowSize(window, w, h);
        glViewport(0, 0, w, h);
        
        //~ printf("[resize] %dx%d aspect %f -> %dx%d aspect %f\n", width, height, aspect, w, h, float(w) / float(h));
        
        width= w;
        height= h;
    }
    
    return 1 - stop;
}


//! creation d'une fenetre pour l'application.
Window create_window( const int w, const int h, const int major, const int minor, const int samples )
{
    // init sdl
    if(SDL_Init(SDL_INIT_VIDEO | SDL_INIT_EVENTS) < 0)
    {
        printf("[error] SDL_Init() failed:\n%s\n", SDL_GetError());
        return nullptr;
    }

    // enregistre le destructeur de sdl
    atexit(SDL_Quit);

    // configuration openGL
#ifndef GK_OPENGLES
    printf("creating window(%d, %d) openGL %d.%d, %d MSAA samples...\n", w, h, major, minor, samples);
    
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, major);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, minor);
#ifndef GK_RELEASE
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_FLAGS, SDL_GL_CONTEXT_DEBUG_FLAG);
#endif
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);

    SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24);
    SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);
    
    if(samples > 1)
    {
        SDL_GL_SetAttribute(SDL_GL_MULTISAMPLEBUFFERS, 1);
        SDL_GL_SetAttribute(SDL_GL_MULTISAMPLESAMPLES, samples);
    }
    
#else
    printf("creating window(%d, %d) openGL ES 3.0...\n", w, h);

    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 0);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_ES);
    SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);
#endif
    
    // creer la fenetre
    Window window= SDL_CreateWindow("gKit",
        SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, w, h,
        SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE);
    if(window == nullptr)
    {
        printf("[error] SDL_CreateWindow() failed.\n");
        return nullptr;
    }
    
    // recupere l'etat du clavier
    int keys;
    const unsigned char *state= SDL_GetKeyboardState(&keys);
    key_states.assign(state, state + keys);
    
    SDL_SetWindowDisplayMode(window, nullptr);
    SDL_StartTextInput();

    // conserve les dimensions de la fenetre
    SDL_GetWindowSize(window, &width, &height);
    aspect= float(width) / float(height);
    
    return window;
}

void release_window( Window window )
{
    SDL_StopTextInput();
    SDL_DestroyWindow(window);
}


#ifndef NO_GLEW
#ifndef GK_RELEASE

//! affiche les messages d'erreur opengl. (contexte debug core profile necessaire).
static
void DEBUGCALLBACK debug_print( GLenum source, GLenum type, unsigned int id, GLenum severity, GLsizei length,
    const char *message, const void *userParam )
{
    static std::set<std::string> log;
    if(log.insert(message).second == false)
        // le message a deja ete affiche, pas la peine de recommencer 60 fois par seconde.
        return;

    if(severity == GL_DEBUG_SEVERITY_HIGH)
        printf("[openGL error]\n%s\n", message);
    else if(severity == GL_DEBUG_SEVERITY_MEDIUM)
        printf("[openGL warning]\n%s\n", message);
    else
        printf("[openGL message]\n%s\n", message);
}
#endif
#endif

//! cree et configure un contexte opengl
Context create_context( Window window )
{
    if(window == nullptr)
        return nullptr;
    
    Context context= SDL_GL_CreateContext(window);
    if(context == nullptr)
    {
        printf("[error] creating openGL context.\n");
        return nullptr;
    }
    
    if(SDL_GL_SetSwapInterval(-1) != 0)
        printf("[warning] can't set adaptive vsync...\n");
    
    if(SDL_GL_GetSwapInterval() != -1)
    {
        printf("vsync ON\n");
        SDL_GL_SetSwapInterval(1);
    }
    else
        printf("adaptive vsync ON\n");
    
    {
        int n= 0;
        SDL_GL_GetAttribute(SDL_GL_MULTISAMPLESAMPLES, &n);
        if(n > 1)
            printf("MSAA %d samples\n", n);
    }
    
    //
    app_start= std::chrono::high_resolution_clock::now();
    
#ifndef NO_GLEW
    // initialise les extensions opengl
    glewExperimental= 1;
    GLenum err= glewInit();
    if(err != GLEW_OK)
    {
        printf("[error] loading extensions\n%s\n", glewGetErrorString(err));
        SDL_GL_DeleteContext(context);
        return nullptr;
    }

    // purge les erreurs opengl generees par glew !
    while(glGetError() != GL_NO_ERROR) {;}

#ifndef GK_RELEASE
    // configure l'affichage des messages d'erreurs opengl, si l'extension est disponible
    if(GLEW_ARB_debug_output)
    {
        printf("debug output enabled...\n");
        // selectionne tous les messages
        glDebugMessageControlARB(GL_DONT_CARE, GL_DONT_CARE, GL_DONT_CARE, 0, NULL, GL_TRUE);
        // desactive les messages du compilateur de shaders
        glDebugMessageControlARB(GL_DEBUG_SOURCE_SHADER_COMPILER, GL_DONT_CARE, GL_DONT_CARE, 0, NULL, GL_FALSE);

        glDebugMessageCallbackARB(debug_print, NULL);
        glEnable(GL_DEBUG_OUTPUT_SYNCHRONOUS_ARB);
    }
#endif
#endif

    return context;
}

void release_context( Context context )
{
    SDL_GL_DeleteContext(context);
}


static std::string smartpath;
static std::string path;

const char *smart_path( const char *filename )
{
    if(exists(filename))
        return filename;

    if(path.empty())
    {
        // recupere la variable d'environnement, si elle existe
        const char *envbase= std::getenv("GKIT_BASE_PATH");
        if(envbase != nullptr)
        {
            path= std::string(envbase);
            if(!path.empty() && path[path.size() -1] != '/')
            {
                path.append("/");       // force un /, si necessaire
                printf("[base path] %s\n", path.c_str());
            }
        }
    }
    
    if(path.empty())
    {
        char *base= SDL_GetBasePath();
        printf("[base path] %s\n", base);
        path= base;
        SDL_free(base);
    }
    
    smartpath= path + filename;
    if(exists(smartpath.c_str()))
        return smartpath.c_str();

    smartpath= path + "../" + filename;
    if(exists(smartpath.c_str()))
        return smartpath.c_str();
    
    return filename; // echec, fichier pas trouve, renvoie quand meme le fichier original. 
    // (permet au moins d'afficher l'erreur fichier non trouve dans l'application)
}
