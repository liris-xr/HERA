
//! \file framebuffer.cpp

#include <cstdio>
#include <cstring>

#include "glcore.h"
#include "texture.h"
#include "uniforms.h"
#include "framebuffer.h"


GLuint Framebuffer::create( const int width, const int height ) 
{
    glGenFramebuffers(1, &m_fbo);
    
    // etat par defaut
    m_draw_buffers= std::vector<GLenum>(8, GL_NONE);
    m_color_textures= std::vector<GLuint>(8, 0);
    m_depth_texture= 0;
    
    m_clear_colors= std::vector< std::array<unsigned, 4> >(8);
    m_clear_depth= 1;
    
    m_color_units= std::vector<int>(8, -1);
    m_depth_unit= -1;
    
    m_width= width;
    m_height= height;
    return m_fbo;
}

void Framebuffer::release( )
{
    glDeleteTextures(8, m_color_textures.data());
    glDeleteTextures(1, &m_depth_texture);
    glDeleteFramebuffers(1, &m_fbo);
}

int Framebuffer::width( ) const
{
    return m_width;
}

int Framebuffer::height( ) const
{
    return m_height;
}


void Framebuffer::bind( const GLuint program, const bool color, const bool depth, const bool position, const bool texcoord, const bool normal, const bool material_id )
{
    if(m_fbo == 0)
        create(m_width, m_height);
    
    // desactive les textures associees au framebuffer, si necessaire (ie l'application ne l'a pas fait... mais non ca n'arrive jamais)
    // todo ou generer une erreur ?
    unbind_textures();
    
    // selectionne le framebuffer
    assert(m_fbo > 0);
    glBindFramebuffer(GL_DRAW_FRAMEBUFFER, m_fbo);

    // verifier que le fragment shader declare chaque sortie... 
    // openGL 4.3 / glGetProgramInterface() et glGetProgramResoucre()
    // uniquement en mode debug...
#ifndef GK_RELEASE
    if(program > 0)
    {
        // recuperer le nom du shader... si possible
        char label[2048]= { 0 };
        #ifdef GL_VERSION_4_3
        {
            char tmp[1024];
            glGetObjectLabel(GL_PROGRAM, program, sizeof(tmp), nullptr, tmp);
            sprintf(label, "program( %u '%s' )", program, tmp);
        }
        #else
            sprintf(label, "program( %u )", program); 
        #endif
        
    #if 0
        // verifie que le program est selectionne
        GLuint current;
        glGetIntegerv(GL_CURRENT_PROGRAM, (GLint *) &current);
        if(current != program)
            printf("[oops] %s: not active... undefined draw !!\n", label); 
    #endif
        
    #ifdef GL_VERSION_4_3
        // lister les sorties du fragment shader
        // fonctionnalite openGL 4.3, n'existe pas sur mac...
        GLint outputs= 0;
        glGetProgramInterfaceiv(program, GL_PROGRAM_OUTPUT, GL_ACTIVE_RESOURCES, &outputs);
        
        char name[1024];
        for(int i= 0; i < outputs; i++)
        {
            int location= -1;
            GLenum props[]= { GL_LOCATION };
            glGetProgramResourceiv(program, GL_PROGRAM_OUTPUT, i, 1, props, 1, nullptr, &location);
            glGetProgramResourceName(program, GL_PROGRAM_OUTPUT, i, sizeof(name), nullptr, name);
            
            if(location == 0)   // sortie color
            {
                if(!color)
                    printf("[oops] color output '%s' in %s not stored...\n", name, label);
            }
            else if(location == 1)  // sortie position
            {
                if(!position)
                    printf("[oops] position output '%s' in %s not stored...\n", name, label);
            }
            else if(location == 2)  // sortie texcoord
            {
                if(!texcoord)
                    printf("[oops] texcoord output '%s' in %s not stored...\n", name, label);
            }
            else if(location == 3)  // sortie normal
            {
                if(!normal)
                    printf("[oops] normal output '%s' in %s not stored...\n", name, label);
            }
            else if(location == 4)  // sortie material_id
            {
                if(!material_id)
                    printf("[oops] material output '%s' in %s not stored...\n", name, label);
            }
        }
    #endif
    }
#endif
    
    // configuration du framebuffer, et creation des textures, si necessaire
    if(depth)
    {
        if(m_depth_texture == 0)
            m_depth_texture= make_depth_texture(0, m_width, m_height);
        
        assert(m_depth_texture > 0);
        glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, m_depth_texture, /* mipmap */ 0);
    }
    else
    {
        glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, 0, /* mipmap */ 0);
    }
    
    //
    bool draw_buffers= false;
    if(color)
    {
        if(m_color_textures[0] == 0)
            m_color_textures[0]= make_vec4_texture(0, m_width, m_height);
        
        assert(m_color_textures[0] > 0);
        if(m_draw_buffers[0] == GL_NONE)
        {
            glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, m_color_textures[0], /* mipmap */ 0);
            m_draw_buffers[0]= GL_COLOR_ATTACHMENT0;
            draw_buffers= true;
        }
    }
    else
    {
        glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, 0, /* mipmap */ 0);
        m_draw_buffers[0]= GL_NONE;
        draw_buffers= true;
    }
    
    if(position)
    {
        if(m_color_textures[1] == 0)
            m_color_textures[1]= make_vec3_texture(0, m_width, m_height);
        
        assert(m_color_textures[1] > 0);
        if(m_draw_buffers[1] == GL_NONE)
        {
            glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_COLOR_ATTACHMENT1, m_color_textures[1], /* mipmap */ 0);
            m_draw_buffers[1]= GL_COLOR_ATTACHMENT1;
            draw_buffers= true;
        }
    }
    else
    {
        glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_COLOR_ATTACHMENT1, 0, /* mipmap */ 0);
        m_draw_buffers[1]= GL_NONE;
        draw_buffers= true;
    }
    
    if(texcoord)
    {
        if(m_color_textures[2] == 0)
            m_color_textures[2]= make_vec2_texture(0, m_width, m_height);
        
        assert(m_color_textures[2] > 0);
        if(m_draw_buffers[2] == GL_NONE)
        {
            glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_COLOR_ATTACHMENT2, m_color_textures[2], /* mipmap */ 0);        
            m_draw_buffers[2]= GL_COLOR_ATTACHMENT2;
            draw_buffers= true;
        }
    }
    else
    {
        glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_COLOR_ATTACHMENT2, 0, /* mipmap */ 0);
        m_draw_buffers[2]= GL_NONE;
        draw_buffers= true;
    }
    
    if(normal)
    {
        if(m_color_textures[3] == 0)
            m_color_textures[3]= make_vec3_texture(0, m_width, m_height);
        
        assert(m_color_textures[3] > 0);
        if(m_draw_buffers[3] == GL_NONE)
        {
            glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_COLOR_ATTACHMENT3, m_color_textures[3], /* mipmap */ 0);
            m_draw_buffers[3]= GL_COLOR_ATTACHMENT3;
            draw_buffers= true;
        }
    }
    else
    {
        glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_COLOR_ATTACHMENT3, 0, /* mipmap */ 0);
        m_draw_buffers[3]= GL_NONE;
        draw_buffers= true;
    }
    
    if(material_id)
    {
        if(m_color_textures[4] == 0)
            m_color_textures[4]= make_uint_texture(0, m_width, m_height);
        
        assert(m_color_textures[4] > 0);
        if(m_draw_buffers[4] == GL_NONE)
        {
            glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_COLOR_ATTACHMENT4, m_color_textures[4], /* mipmap */ 0);
            m_draw_buffers[4]= GL_COLOR_ATTACHMENT4;
            draw_buffers= true;
        }
    }
    else
    {
        glFramebufferTexture(GL_DRAW_FRAMEBUFFER, GL_COLOR_ATTACHMENT4, 0, /* mipmap */ 0);
        m_draw_buffers[4]= GL_NONE;
        draw_buffers= true;
    }
    
    if(draw_buffers)
        glDrawBuffers(8, m_draw_buffers.data());
    
    // verifie la configuration du framebuffer
    if(!status())
        return;
    
    // prepare le rendu dans le framebuffer
    glViewport(0, 0, m_width, m_height);
    
    // pas joli, mais plus simple que declarer n variables du bon type...
    if(depth)
        glClearBufferfv(GL_DEPTH, 0, &m_clear_depth);
    if(color)
        glClearBufferfv(GL_COLOR, 0, (const GLfloat *) &m_clear_colors[0]);
    if(position)
        glClearBufferfv(GL_COLOR, 1, (const GLfloat *) &m_clear_colors[1]);
    if(texcoord)
        glClearBufferfv(GL_COLOR, 2, (const GLfloat *) &m_clear_colors[2]);
    if(normal)
        glClearBufferfv(GL_COLOR, 3, (const GLfloat *) &m_clear_colors[3]);
    if(material_id)
        glClearBufferuiv(GL_COLOR, 4, (const GLuint *) &m_clear_colors[4]);
}


void Framebuffer::unbind( const int width, const int height )
{
    glBindFramebuffer(GL_DRAW_FRAMEBUFFER, 0);
    glViewport(0, 0, width, height);
}


void Framebuffer::unbind_textures( )
{
    // desactive les textures associees au framebuffer, si necessaire
    // le pipeline ne peut pas lire et modifier les textures en meme temps.
    for(int i= 0; i < 8; i++)
        if(m_color_units[i] != -1)
        {
            glActiveTexture(GL_TEXTURE0 + m_color_units[i]);
            glBindTexture(GL_TEXTURE_2D, 0);
            
            m_color_units[i]= -1;
        }
    
    if(m_depth_unit != -1)
    {
        glActiveTexture(GL_TEXTURE0 + m_depth_unit);
        glBindTexture(GL_TEXTURE_2D, 0);
        
        m_depth_unit= -1;
    }
}



void Framebuffer::clear_depth( const float value )
{
    if(m_fbo == 0)
        printf("[error] uninitialized framebuffer...\n");
    
    m_clear_depth= value;
}

void Framebuffer::clear_color( const Color& value )
{
    if(m_fbo == 0)
        printf("[error] uninitialized framebuffer...\n");
    
    float values[4]= { value.r, value.g, value.b, value.a };
    memcpy(&m_clear_colors[0], values, sizeof(values));
}

void Framebuffer::clear_position( const Point& value )
{
    if(m_fbo == 0)
        printf("[error] uninitialized framebuffer...\n");
    
    float values[4]= { value.x, value.y, value.z, 0 };
    memcpy(&m_clear_colors[1], values, sizeof(values));
}

void Framebuffer::clear_texcoord( const vec2& value )
{
    if(m_fbo == 0)
        printf("[error] uninitialized framebuffer...\n");
    
    float values[4]= { value.x, value.y, 0, 0 };
    memcpy(&m_clear_colors[2], values, sizeof(values));
}

void Framebuffer::clear_normal( const Vector& value )
{
    if(m_fbo == 0)
        printf("[error] uninitialized framebuffer...\n");
    
    float values[4]= { value.x, value.y, value.z, 0 };
    memcpy(&m_clear_colors[3], values, sizeof(values));
}

void Framebuffer::clear_material( const unsigned value )
{
    if(m_fbo == 0)
        printf("[error] uninitialized framebuffer...\n");
    
    unsigned values[4]= { value, 0, 0, 0 };
    memcpy(&m_clear_colors[4], values, sizeof(values));
}


bool Framebuffer::status( )
{
    glBindFramebuffer(GL_DRAW_FRAMEBUFFER, m_fbo);
    GLenum code= glCheckFramebufferStatus(GL_DRAW_FRAMEBUFFER);
    
    if(code == GL_FRAMEBUFFER_INCOMPLETE_DRAW_BUFFER)
        printf("[error] framebuffer: incomplete draw buffer... can't draw!\n");
    else if(code == GL_FRAMEBUFFER_UNSUPPORTED)
        printf("[error] framebuffer: unsupported format... can't draw!\n");
    
    return (code == GL_FRAMEBUFFER_COMPLETE);
}


void Framebuffer::use_depth_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler )
{
    m_depth_unit= unit;
    program_use_texture(program, uniform, unit, m_depth_texture, sampler);
}

void Framebuffer::use_color_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler )
{
    m_color_units[0]= unit;
    program_use_texture(program, uniform, unit, m_color_textures[0], sampler);
}

void Framebuffer::use_position_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler )
{
    m_color_units[1]= unit;
    program_use_texture(program, uniform, unit, m_color_textures[1], sampler);
}

void Framebuffer::use_texcoord_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler )
{
    m_color_units[2]= unit;
    program_use_texture(program, uniform, unit, m_color_textures[2], sampler);
}

void Framebuffer::use_normal_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler )
{
    m_color_units[3]= unit;
    program_use_texture(program, uniform, unit, m_color_textures[3], sampler);
}

void Framebuffer::use_material_texture( const GLuint program, const char *uniform, const int unit, const GLuint sampler )
{
    m_color_units[4]= unit;
    program_use_texture(program, uniform, unit, m_color_textures[4], sampler);
}



void Framebuffer::blit_depth( const int dstX0, const int dstY0, const int dstX1, const int dstY1 )
{
    glBindFramebuffer(GL_READ_FRAMEBUFFER, m_fbo);
    
    glBlitFramebuffer(0, 0, m_width, m_height, dstX0, dstY0, dstX1, dstY1, GL_DEPTH_BUFFER_BIT, GL_NEAREST);
    
    glBindFramebuffer(GL_READ_FRAMEBUFFER, 0);
}

void Framebuffer::blit_color( const int dstX0, const int dstY0, const int dstX1, const int dstY1 )
{
    glBindFramebuffer(GL_READ_FRAMEBUFFER, m_fbo);
    glReadBuffer(GL_COLOR_ATTACHMENT0);
    
    glBlitFramebuffer(0, 0, m_width, m_height, dstX0, dstY0, dstX1, dstY1, GL_COLOR_BUFFER_BIT, GL_NEAREST);

    glBindFramebuffer(GL_READ_FRAMEBUFFER, 0);
}

void Framebuffer::blit_position( const int dstX0, const int dstY0, const int dstX1, const int dstY1 )
{
    glBindFramebuffer(GL_READ_FRAMEBUFFER, m_fbo);
    glReadBuffer(GL_COLOR_ATTACHMENT1);
    
    glBlitFramebuffer(0, 0, m_width, m_height, dstX0, dstY0, dstX1, dstY1, GL_COLOR_BUFFER_BIT, GL_NEAREST);

    glBindFramebuffer(GL_READ_FRAMEBUFFER, 0);
}

void Framebuffer::blit_texcoord( const int dstX0, const int dstY0, const int dstX1, const int dstY1 )
{
    glBindFramebuffer(GL_READ_FRAMEBUFFER, m_fbo);
    glReadBuffer(GL_COLOR_ATTACHMENT2);
    
    glBlitFramebuffer(0, 0, m_width, m_height, dstX0, dstY0, dstX1, dstY1, GL_COLOR_BUFFER_BIT, GL_NEAREST);

    glBindFramebuffer(GL_READ_FRAMEBUFFER, 0);
}

void Framebuffer::blit_normal( const int dstX0, const int dstY0, const int dstX1, const int dstY1 )
{
    glBindFramebuffer(GL_READ_FRAMEBUFFER, m_fbo);
    glReadBuffer(GL_COLOR_ATTACHMENT3);
    
    glBlitFramebuffer(0, 0, m_width, m_height, dstX0, dstY0, dstX1, dstY1, GL_COLOR_BUFFER_BIT, GL_NEAREST);

    glBindFramebuffer(GL_READ_FRAMEBUFFER, 0);
}


// marche pas, utiliser un shader pour convertir les valeurs en couleurs...
//~ void Framebuffer::blit_material( const int dstX0, const int dstY0, const int dstX1, const int dstY1 )
//~ {
    //~ glBindFramebuffer(GL_READ_FRAMEBUFFER, m_fbo);
    //~ glReadBuffer(GL_COLOR_ATTACHMENT4);
    
    //~ glBlitFramebuffer(0, 0, m_width, m_height, dstX0, dstY0, dstX1, dstY1, GL_COLOR_BUFFER_BIT, GL_NEAREST);

    //~ glBindFramebuffer(GL_READ_FRAMEBUFFER, 0);
//~ }

