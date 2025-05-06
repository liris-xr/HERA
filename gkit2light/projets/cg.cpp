
//! \file tuto9.cpp utilisation d'un shader 'utilisateur' pour afficher un objet Mesh

#include <cmath>
#include <cstddef>
#include <iostream>
#include <vector>

#include "mat.h"
#include "mesh.h"
#include "texture.h"
#include "wavefront.h"

#include "orbiter.h"
#include "program.h"
#include "uniforms.h"
#include "draw.h"

#include "app_time.h"        // classe Application a deriver



// utilitaire. creation d'une grille / repere.
Mesh make_grid( const int n= 10 )
{
    Mesh grid= Mesh(GL_LINES);
    
    // grille
    grid.color(White());
    for(int x= 0; x < n; x++)
    {
        float px= float(x) - float(n)/2 + .5f;
        grid.vertex(Point(px, 0, - float(n)/2 + .5f)); 
        grid.vertex(Point(px, 0, float(n)/2 - .5f));
    }

    for(int z= 0; z < n; z++)
    {
        float pz= float(z) - float(n)/2 + .5f;
        grid.vertex(Point(- float(n)/2 + .5f, 0, pz)); 
        grid.vertex(Point(float(n)/2 - .5f, 0, pz)); 
    }
    
    // axes XYZ
    grid.color(Red());
    grid.vertex(Point(0, 0.1, 0));
    grid.vertex(Point(1, 0.1, 0));
    
    grid.color(Green());
    grid.vertex(Point(0, 0.1, 0));
    grid.vertex(Point(0, 1.1, 0));
    
    grid.color(Blue());
    grid.vertex(Point(0, 0.1, 0));
    grid.vertex(Point(0, 0, 1));
    
    return grid;
}

std::vector<GLenum> make_textures(size_t width, size_t height) {
    GLuint zbuffer= make_depth_texture( /* unit */ 0, width, height);
    GLuint position= make_vec3_texture( /* unit */ 0, width,  height);
    GLuint normal= make_vec3_texture( /* unit */ 0, width, height);
    GLuint color = make_vec3_texture( /* unit */ 0, width, height);

     // configuration du framebuffer
    GLuint framebuffer= 0;
    glGenFramebuffers(1, &framebuffer);
    glBindFramebuffer(GL_DRAW_FRAMEBUFFER, framebuffer);

    std::vector<GLenum> buffers;

    buffers.push_back(GL_COLOR_ATTACHMENT0);
    buffers.push_back(GL_COLOR_ATTACHMENT1);
    buffers.push_back(GL_COLOR_ATTACHMENT2);
    

    glFramebufferTexture(GL_DRAW_FRAMEBUFFER, /* attachment */ GL_DEPTH_ATTACHMENT, zbuffer, /* mipmap */ 0);    // associe une texture a la sortie zbuffer du frambuffer;
    glFramebufferTexture(GL_DRAW_FRAMEBUFFER, /* attachment */ buffers[0], position, /* mipmap */ 0);  // associe une texture a la sortie 0
    glFramebufferTexture(GL_DRAW_FRAMEBUFFER, /* attachment */ buffers[1], normal, /* mipmap */ 0);    // associe une texture a la sortie 1
    glFramebufferTexture(GL_DRAW_FRAMEBUFFER, /* attachment */ buffers[2], color, /* mipmap */ 0);    // associe une texture a la sortie 2

    return buffers;

}

// utilise AppTime pour les screenshots...
class TP : public AppTime
{
public:
    // constructeur : donner les dimensions de l'image, et eventuellement la version d'openGL.
    TP( ) : AppTime(1024, 640) {}
    
    int init( )
    {
        // m_grid= make_grid();
        meshData = read_indexed_mesh("data/cube.obj");

        vao= meshData.create_buffers(meshData.has_texcoord(), meshData.has_normal(), meshData.has_color(), meshData.has_material_index());
        count= meshData.index_count();

        Point pmin, pmax;
        m_grid.bounds(pmin, pmax);
        m_camera.lookat(pmin, pmax);

        // etape 1 : creer le shader program
        m_program= read_program("projets/cg.glsl");
        program_print_errors(m_program);

        std::vector<GLenum> buffers = make_textures(1024,640);
        glDrawBuffers(buffers.size(),buffers.data());

        if(glCheckFramebufferStatus(GL_DRAW_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE)
            return 1;
        

        // etat openGL par defaut
        glClearColor(0.2f, 0.2f, 0.2f, 1.f);        // couleur par defaut de la fenetre
        
        glClearDepth(1.f);                          // profondeur par defaut
        glDepthFunc(GL_LESS);                       // ztest, conserver l'intersection la plus proche de la camera
        glEnable(GL_DEPTH_TEST);                    // activer le ztest

        return 0;   // ras, pas d'erreur
    }
    
    // destruction des objets de l'application
    int quit( )
    {
        // etape 3 : detruire le shader program
        release_program(m_program);
        // et les objets
        // m_grid.release();
        meshData.release();
        return 0;
    }
    
    // dessiner une nouvelle image
    int render( )
    {
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        // recupere l'etat de la souris
        int mx, my;
        unsigned int mb= SDL_GetRelativeMouseState(&mx, &my);
        
        // deplace la camera
        if(mb & SDL_BUTTON(1))
            m_camera.rotation(mx, my);      // tourne autour de l'objet
        else if(mb & SDL_BUTTON(3))
            m_camera.translation((float) mx / (float) window_width(), (float) my / (float) window_height()); // deplace le point de rotation
        else if(mb & SDL_BUTTON(2))
            m_camera.move(mx);           // approche / eloigne l'objet
        
        // recupere l'etat de la molette / touch
        SDL_MouseWheelEvent wheel= wheel_event();
        if(wheel.y != 0)
        {
            clear_wheel_event();
            m_camera.move(8.f * wheel.y);  // approche / eloigne l'objet
        }
        
        // recharge le shader program
        if(key_state('r'))
        {
            clear_key_state('r');        // une seule fois...
            reload_program(m_program, "projets/cg.glsl");
            program_print_errors(m_program);
        }
        
        // etape 2 : dessiner m_objet avec le shader program
        // configurer le pipeline 
        glUseProgram(m_program);

        // configurer le shader program
        // . recuperer les transformations
        Transform model= RotationX(global_time() / 20);
        Transform view= m_camera.view();
        Transform projection= m_camera.projection(window_width(), window_height(), 45);
        
        Transform mv= view * model;
        Transform mvp= projection * mv;
        
        program_uniform(m_program, "mvpMatrix", mvp);
        
        glBindFramebuffer(GL_DRAW_FRAMEBUFFER, 0);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        glBindVertexArray(vao);

        glDrawElements(GL_TRIANGLES,count,GL_UNSIGNED_INT,nullptr);


        // draw(m_grid, Identity(), m_camera);
        
        return 1;
    }

protected:
    Mesh meshData;
    Mesh m_grid;
    Orbiter m_camera;
    GLuint m_program;
    GLuint vao;
    GLuint frameBuffer;
    int count;
};


int main( int argc, char **argv )
{
    TP tp;
    tp.run();
    
    return 0;
}

