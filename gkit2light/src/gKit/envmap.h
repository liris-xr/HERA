
#ifndef _ENVMAP_H
#define _ENVMAP_H

#include <array>

#include "vec.h"
#include "color.h"
#include "image.h"

//! representation d'une cubemap / envmap.
struct Envmap
{
    Envmap( ) : m_faces(), m_width(0) {}
    
    Envmap( const int size ) : m_faces(), m_width(size) 
    {
        for(int i= 0; i < 6; i++)
            m_faces[i]= Image(size, size);
    }
    
    //! extrait les 6 faces d'une image.
    Envmap( const Image& image ) : m_faces(), m_width(0)
    {
        int w= image.width() / 4;
        int h= image.height() / 3;
        if(w != h)
            return;
        
        m_width= w;
        
        // chaque face de la cubemap est un carre [image.width/4 x image.height/3] dans l'image originale 
        struct { int x, y; } faces[]= {
            {0, 1}, // X+
            {2, 1}, // X-
            {1, 2}, // Y+
            {1, 0}, // Y- 
            {1, 1}, // Z+
            {3, 1}, // Z-
        };
        
        for(int i= 0; i < 6; i++)
            m_faces[i]= flipX(flipY(copy(image, faces[i].x*w, faces[i].y*h, w, h)));
    }
    
    //! utilise les 6 faces.
    Envmap( const std::array<Image, 6>& faces ) : m_faces()
    {
        for(int i= 0; i < 6; i++)
            m_faces[i]= flipX(flipY(faces[i]));
        
        m_width= m_faces[0].width();
        for(int i= 0; i < 6; i++)
            if(m_width != m_faces[i].width() || m_width != m_faces[i].height())
                m_width= 0;
    }
    
    int width( ) const { return m_width; }      //!< largeur d'une face.
    int height( ) const { return m_width; }     //!< hauteur d'une face.
    bool empty() const { return m_width == 0; } //!< renvoie vrai si la cubemap est initialisee.
    
    //! applique une correction gamma inverse aux donnees de la cubemap. 
    void linear( const float gamma = 2.2f )
    {
        for(int i= 0; i < 6; i++)
        for(int p= 0; p < int(m_faces[i].size()); p++)
        {
            Color pixel= m_faces[i](p);
            m_faces[i](p)= Color(std::pow(pixel.r, gamma), std::pow(pixel.g, gamma), std::pow(pixel.b, gamma));
        }
    }
    
    //! applique une correction gamma aux donnees de la cubemap.
    void gamma( const float gamma = 2.2f )
    {
        for(int i= 0; i < 6; i++)
        for(int p= 0; p < int(m_faces[i].size()); p++)
        {
            Color pixel= m_faces[i](p);
            m_faces[i](p)= Color(std::pow(pixel.r, 1 / gamma), std::pow(pixel.g, 1 / gamma), std::pow(pixel.b, 1 / gamma));
        }
    }
    
    //! renvoie une image contenant les 6 faces de la cubemap.
    Image cross( ) const
    {
        if(empty())
            return Image();
        
        // chaque face de la cubemap est un carre [image.width/4 x image.height/3] dans l'image originale 
        struct { int x, y; } faces[]= {
            {0, 1}, // X+
            {2, 1}, // X-
            {1, 2}, // Y+
            {1, 0}, // Y- 
            {1, 1}, // Z+
            {3, 1}, // Z-
        };
        
        // 3 lignes de 4 colonnes
        Image image(4*width(), 3*height());
        for(int i= 0; i < 6; i++)
        {
            Image face= flipY(flipX(m_faces[i]));
            
            int xmin= faces[i].x*width();
            int ymin= faces[i].y*height();
            for(int y= 0; y < height(); y++)
            for(int x= 0; x < width(); x++)
                image(xmin+x, ymin+y)= face(x, y);
        }
        
        return image;
    }
    
    //! renvoie les 6 faces de la cubemap.
    std::array<Image, 6> faces( ) const
    {
        if(empty())
            return std::array<Image, 6>();
        
        std::array<Image, 6> faces;
        for(int i= 0; i < 6; i++)
            faces[i]= flipY(flipX(m_faces[i]));
        
        return faces;
    }
    
    Color& operator() ( const int face, const int x, const int y )
    {
        return m_faces[face](x, y);
    }
    
    Color operator() ( const int face, const int x, const int y ) const
    {
        return m_faces[face](x, y);
    }
    
    //! renvoie la couleur de la cubemap dans la direction d, utilise les memes conventions qu'openGL / Renderman.
    Color texture( const Vector& d ) const
    {
        // reproduit la convention opengl / renderman
        // cf https://www.khronos.org/registry/OpenGL/specs/gl/glspec46.core.pdf#section.8.13
        
        float sm, tm;
        int face= -1;
        Vector m= Vector(std::abs(d.x), std::abs(d.y), std::abs(d.z));
        if(m.x > m.y && m.x > m.z)
        {
            // X
            if(d.x > 0)
            {
                face= 0;
                sm= -d.z / m.x;
                tm= -d.y / m.x;
            }
            else
            {
                face= 1;
                sm= d.z / m.x;
                tm= -d.y / m.x;
            }
        }
        else if(m.y > m.z)
        {
            // Y
            if(d.y > 0)
            {
                face= 2;
                sm= d.x / m.y;
                tm= d.z / m.y;
            }
            else
            {
                face= 3;
                sm= d.x / m.y;
                tm= -d.z / m.y;
            }
        }
        else
        {
            // Z
            if(d.z > 0)
            {
                face= 4;
                sm= d.x / m.z;
                tm= -d.y / m.z;
            }
            else
            {
                face= 5;
                sm= -d.x / m.z;
                tm= -d.y / m.z;
            }
        }
        
        assert(face != -1);
        float s= (sm +1) / 2;
        float t= (tm +1) / 2;
        return m_faces[face].texture(s, t);
    }
    
    // mapping direction vers pixel [0 .. w]x[0 .. h]
    Vector envmap_pixel( const Vector& d ) { Vector texel= envmap_texel(d); return Vector(texel.x, texel.y * m_width, texel.z * m_width); }
    
    // mapping direction vers texel [0 .. 1]x[0 .. 1]
    Vector envmap_texel( const Vector& d )
    {
        float sm, tm;
        int face= -1;
        Vector m= Vector(std::abs(d.x), std::abs(d.y), std::abs(d.z));
        if(m.x > m.y && m.x > m.z)
        {
            // X
            if(d.x > 0)
            {
                face= 0;
                sm= -d.z / m.x;
                tm= -d.y / m.x;
            }
            else
            {
                face= 1;
                sm= d.z / m.x;
                tm= -d.y / m.x;
            }
        }
        else if(m.y > m.z)
        {
            // Y
            if(d.y > 0)
            {
                face= 2;
                sm= d.x / m.y;
                tm= d.z / m.y;
            }
            else
            {
                face= 3;
                sm= d.x / m.y;
                tm= -d.z / m.y;
            }
        }
        else
        {
            // Z
            if(d.z > 0)
            {
                face= 4;
                sm= d.x / m.z;
                tm= -d.y / m.z;
            }
            else
            {
                face= 5;
                sm= -d.x / m.z;
                tm= -d.y / m.z;
            }
        }
        
        assert(face != -1);
        float s= (sm +1) / 2;
        float t= (tm +1) / 2;
        return Vector(face, s, t);
    }

    // mapping texel vers direction
    Vector envmap_pixel_direction( const Vector& d ) { return envmap_texel_direction(int(d.x), d.y / m_width, d.z / m_width); }
    
    Vector envmap_texel_direction( const Vector& d ) { return envmap_texel_direction(int(d.x), d.y, d.z); }
    
    Vector envmap_texel_direction( const int face, const float s, const float t )
    {
        // retrouve le point sur le cube [-1 .. 1]
        float sm= 2 * s -1;
        float tm= 2 * t -1;
        if(face == 0)
        {
            // X+
            // sm= -d.z / m.x;
            // tm= -d.y / m.x;
            return Vector(1, -tm, -sm);
        }
        else if(face == 1)
        {
            // X-
            // sm= d.z / m.x;
            // tm= -d.y / m.x;
            return Vector(-1, -tm, sm);
        }
        else if(face == 2)
        {
            // Y+
            // sm= d.x / m.y;
            // tm= d.z / m.y;
            return Vector(sm, 1, tm);
        }
        else if(face == 3)
        {
            // Y-
            // sm= d.x / m.y;
            // tm= -d.z / m.y;
            return Vector(sm, -1, -tm);
        }
        else if(face == 4)
        {
            // Z+
            // sm= d.x / m.z;
            // tm= -d.y / m.z;
            return Vector(sm, -tm, 1);
        }
        else // if(face == 5)
        {
            // Z-
            // sm= -d.x / m.z;
            // tm= -d.y / m.z;
            return Vector(-sm, -tm, -1);
        }
    }
    
protected:
    std::array<Image, 6> m_faces;
    int m_width;
};

//! charge une cubemap. les 6 faces sont dans une seule image.
Envmap read_cubemap( const char *filename );
//! charge une cubemap. les 6 faces sont dans 6 images, dans l'ordre openGL +x -x, +y -y, +z -z.
Envmap read_cubemap_faces( const std::array<const char *, 6>& filenames );
//! charge une cubemap. les 6 faces sont dans 6 images, prefix = "sky%s.[png|jpg|bmp|tga|hdr]", les suffixes sont : "posx", "negx", "posy", "negy", "posz", "negz".
Envmap read_cubemap_faces( const char *prefix );

//! enregistre une cubemap dans une image.
int write_cubemap( const Envmap& envmap, const char *filename );
//! enregistre une cubemap dans 6 images. prefix = "sky%s.[png|hdr]", les suffixes sont : "posx", "negx", "posy", "negy", "posz", "negz".
int write_cubemap_faces( const Envmap& envmap, const char *prefix );


#endif

