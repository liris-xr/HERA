
//! \file framebuffer.h

#ifndef _FRAMEBUFFER_H
#define _FRAMEBUFFER_H

#include <vector>
#include <array>

#include "texture.h"


/*! stockage des sorties d'un fragment shader. 
    exemple complet d'utilisation dans tuto_shadows.cpp 
    
\code
Framebuffer framebuffer;
GLuint program1;
GLuint program2;

init( ) : 
    program1= read_program( "..." );
    program2= read_program( "..." );
    
    framebuffer.create(1024, 1024);
    framebuffer.clear_color( White() );
    framebuffer.clear_depth( 1 );
    
render( ) :
    // etape 1 : dessiner des objets dans le framebuffer, avec un shader qui stocke une ou plusieurs valeurs par pixel
        glUseProgram( program1 );
        framebuffer.bind( program1, store_color, store_depth, store_position, store_texcoord, store_normal, store_material );
        
    // draw
        { ... }
    
    // etape 2 : retour au framebuffer de la fenetre
        framebuffer.unbind( window_width(), window_height() );
    
    // etape 3 : utiliser les valeurs stockees dans le framebuffer, comme des textures... avec un autre shader...
        glUseProgram( program2 );
        framebuffer.use_color_texture( program2, "sampler2D declare dans le shader", unit );
        
    // draw
        { ... }
        
    // etape 4 : nettoyage !!
        framebuffer.unbind_textures();
\endcode
*/

struct Framebuffer
{
    Framebuffer( ) = default;
    
    //! creation du framebuffer
    GLuint create( const int width, const int height );
    //! destruction.
    void release( );
    
    //! renvoie la largeur du framebuffer.
    int width( ) const;
    //! renvoie la hauteur du framebuffer.
    int height( ) const;
    
    //! @name configuration des valeurs par defaut.
///@{
    void clear_color( const Color& value );     //!< couleur par defaut.
    void clear_depth( const float value );      //!< profondeur par defaut.
    void clear_position( const Point& value );  //!< position par defaut.
    void clear_texcoord( const vec2& value );   //!< texcoord par defaut.
    void clear_normal( const Vector& value );   //!< normale par defaut.
    void clear_material( const unsigned value );    //!< indice de matiere par defaut.
///@}

    //! selection du framebuffer, stocker les sorties du fragment shader. les textures sont initialisees avec les valeurs par defaut definies par clear_color(), clear_depth(), etc.
    void bind( const GLuint program, const bool store_color, const bool store_depth, const bool store_position, const bool store_texcoord, const bool store_normal, const bool store_material );
    
    //! desactive le framebuffer, selection du framebuffer par defaut associe a la fenetre.
    void unbind( const int width, const int height );
    
    //! nettoyage, desactive les textures utilisees par les autres shaders, cf use_color_texture(), etc.
    void unbind_textures( );
    
    /*! @name utilisation des textures resultats par un shader.
        meme utilisation que program_use_texture().
    */
///@{
    void use_color_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler= 0 ); 
    void use_depth_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler= 0 ); 
    void use_position_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler= 0 ); 
    void use_texcoord_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler= 0 ); 
    void use_normal_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler= 0 ); 
    void use_material_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler= 0 ); 
///@}
    
    /*! @name visualisation des textures.
        copie la texture dans le rectangle (X0, Y0) x (X1, Y1) du framebuffer actuellement selectionne sur GL_DRAW_FRAMEBUFFER, utilise glBlitFramebuffer().
    */
///@{
    void blit_depth( const int dstX0, const int dstY0, const int dstX1, const int dstY1 );
    void blit_color( const int dstX0, const int dstY0, const int dstX1, const int dstY1 );
    void blit_position( const int dstX0, const int dstY0, const int dstX1, const int dstY1 );
    void blit_texcoord( const int dstX0, const int dstY0, const int dstX1, const int dstY1 );
    void blit_normal( const int dstX0, const int dstY0, const int dstX1, const int dstY1 );
    //~ void blit_material( const int dstX0, const int dstY0, const int dstX1, const int dstY1 );
///@}
    
protected:
    bool status( );
    
    std::vector<GLenum> m_draw_buffers;
    std::vector<GLuint> m_color_textures;
    
    std::vector< std::array<unsigned,4> > m_clear_colors;
    std::vector<int> m_color_units;
    float m_clear_depth;
    int m_depth_unit;
    
    GLuint m_depth_texture;
    GLuint m_fbo;
    int m_width;
    int m_height;
};


#endif
