// exemple : lecture et affichage d'un mesh, avec un shader de base + gestion des evenements par window.h

#include "materials.h"
#include "texture.h"
#include "vec.h"
#include "mat.h"

#include "window.h"
#include "glcore.h"

#include "mesh_io.h"
#include "buffers.h"
#include "program.h"
#include "uniforms.h"


GLuint program= 0;
GLuint vao= 0;
GLuint tex0, tex1, tex2, tex3;
unsigned count= 0;

class MaterialGL { 
    public:
        Material m;
        int a;
        int b;
        int c;
        MaterialGL(Material m) : m(m), a(0), b(0), c(0) {}
};

bool init( )
{   
    MeshIOData data;


    if(!read_meshio_data("data/ramlethal.obj", data))
        return false;   // erreur de lecture
    
    std::vector<MaterialGL> materialsGL;

    for(Material m : data.materials.materials) {
        materialsGL.push_back(m);
    } 

    GLuint materials;
    glGenBuffers(1,&materials);
    glBindBuffer(GL_SHADER_STORAGE_BUFFER,materials);
    glBufferData(GL_SHADER_STORAGE_BUFFER,
    data.materials.materials.size()*sizeof(MaterialGL),
    materialsGL.data(),
    GL_STATIC_DRAW);

    glBindBufferBase(GL_SHADER_STORAGE_BUFFER,0,materials);

    GLuint triangleMaterials;
    glGenBuffers(1,&triangleMaterials);
    glBindBuffer(GL_SHADER_STORAGE_BUFFER,triangleMaterials);
    glBufferData(GL_SHADER_STORAGE_BUFFER,
    data.materials.materials.size()*sizeof(int),
    data.material_indices.data(),
    GL_STATIC_DRAW);

    glBindBufferBase(GL_SHADER_STORAGE_BUFFER,1,triangleMaterials);

    glPixelStorei(GL_UNPACK_ALIGNMENT, 1);
    glPixelStorei(GL_UNPACK_ROW_LENGTH, 0);
    glPixelStorei(GL_UNPACK_SKIP_PIXELS, 0);
    glPixelStorei(GL_UNPACK_SKIP_ROWS, 0);

    
    tex0 = read_texture(0,data.materials.texture_filenames[0].c_str());
    //tex1 = read_texture(1, data.materials.texture_filenames[1].c_str());
    //tex2 = read_texture(2, data.materials.texture_filenames[2].c_str());
    //tex3 = read_texture(3, data.materials.texture_filenames[3].c_str());


    


    vao= create_buffers(data.positions, data.indices, data.texcoords, data.normals);
    
    count= data.indices.size();


    
    // charge et compile les shaders.
    program= read_program("projets/tp4.glsl");
    // affiche les erreurs de maniere lisible.
    program_print_errors(program);
    
    if(!program_ready(program))
        return false;   // erreur de compilation / link / chargement des shaders
    
    return true;
}

void quit( ) 
{
    release_buffers(vao);
}


void draw(float rotX, float rotY, float zoom, float transX, float transY, Vector light)
{
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    
    Transform model;    // placer le modele
    Transform view = Translation(transX, transY-2, -10);     // camera
    view = view * RotationX(rotX);
    view = view * RotationY(rotY);
    view = view * Scale(zoom);
    Transform projection = Perspective(45, 1024.0 / 576.0, 0.1, 100);
    Transform mvp= projection * view * model;
    Transform mv= view * model;
    
    // super pratique, mais il faut faire traiter les evenements par la fonction events de window.h
    if(key_state(' '))
        model= Translation(1, 0, 0);
    
    glBindVertexArray(vao);
    glUseProgram(program);

    

    program_use_texture(program, "texture0", 0, tex0);
    //program_use_texture(program, "texture1", 1, tex1);
    //program_use_texture(program, "texture2", 2, tex2);
    //program_use_texture(program, "texture3", 3, tex3);
    
    program_uniform(program, "mvpMatrix", mvp);
    program_uniform(program,"mvMatrixInv",Inverse(mv));
    program_uniform(program, "mvMatrix", mv);
    program_uniform(program,"light",light);
    
    glDrawElements(GL_TRIANGLES, count, GL_UNSIGNED_INT, nullptr);
}


int main(int argc, char** argv)
{
    Window window= create_window(1024, 576);
    Context context= create_context(window);
    
    // etat openGL de base / par defaut
    glViewport(0, 0, 1024, 576);
    glClearColor(0.2, 0.2, 0.2, 1);
    glClearDepth(1);
    glDepthFunc(GL_LESS);
    glEnable(GL_DEPTH_TEST);
    
    if(!init())
        return 1;

    bool close= false;
    float angleX = 0;
    float angleY = 0;
    float zoom = 1;
    float tx = 0;
    float ty = 0;
    Vector light(-5,5,-5);
    while(events(window))
    {
        
        while(!close)
        {
            SDL_Event event;
            // recuperer un evenement a la fois, poll event renvoie faux lorsqu'ils ont tous ete traite
            while(SDL_PollEvent(&event))
            {
                if(event.type == SDL_QUIT)
                    close= true;  // sortir si click sur le bouton 'fermer' de la fenetre
                else if(event.type == SDL_KEYDOWN && event.key.keysym.sym == SDLK_ESCAPE)
                    close= true;  // sortir si la touche esc / echapp est enfonce
                else if(event.key.keysym.sym == SDLK_d)
                    angleY--;
                else if(event.key.keysym.sym == SDLK_q)
                    angleY++;
                else if(event.key.keysym.sym == SDLK_z)
                    angleX++;
                else if(event.key.keysym.sym == SDLK_s)
                    angleX--;
                else if(event.key.keysym.sym == SDLK_UP)
                    zoom = zoom + 0.01;
                else if(event.key.keysym.sym == SDLK_DOWN)
                    zoom = zoom - 0.01;
                else if(event.key.keysym.sym == SDLK_k)
                    light.x = light.x + 0.1;
                else if(event.key.keysym.sym == SDLK_m)
                    light.x = light.x - 0.1;
                else if(event.key.keysym.sym == SDLK_o)
                    light.z = light.z + 0.1;
                else if(event.key.keysym.sym == SDLK_l)
                    light.z = light.z - 0.1;
                else if(event.key.keysym.sym == SDLK_y)
                    light.y = light.y + 0.1;
                else if(event.key.keysym.sym == SDLK_h)
                    light.y = light.y - 0.1;
            }
        
        // dessiner
        draw(angleX,angleY, zoom, tx, ty,light);
        
        // presenter / montrer le resultat
        SDL_GL_SwapWindow(window);
    }
    }
    
    quit();
    
    release_context(context);
    release_window(window);
    return 0;
}
