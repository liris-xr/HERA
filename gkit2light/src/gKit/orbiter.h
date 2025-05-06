
#ifndef _ORBITER_H
#define _ORBITER_H

#include "vec.h"
#include "mat.h"


//! \addtogroup objet3D
///@{

//! \file 
//! camera pour observer un objet.

//! representation de la camera, type orbiter, placee sur une sphere autour du centre de l'objet.
class Orbiter
{
public:
    //! cree une camera par defaut. observe le centre (0, 0, 0) a une distance 5.
    Orbiter( ) : m_center(), m_position(), m_rotation(), m_size(5.f), m_radius(5.f), m_width(1), m_height(1), m_fov(45) {}
    
    //! observe le point center a une distance size.
    void lookat(  const Point& center, const float size );
    //! observe le centre d'une boite englobante.
    void lookat( const Point& pmin, const Point& pmax );
    
    //! fixe la projection reglee pour une image d'aspect width / height, et une demi ouverture de fov degres.
    Transform projection( const int width, const int height, const float fov );
    //! renvoie le plan proche de la projection. distance min des points dans le frustum de la camera (valeur dans le repere camera).
    float znear( ) const;
    //! revnvoie le plan loin de la projection. distance max des points dans le frustum de la camera (valeur dans le repere camera).
    float zfar( ) const;
    
    //! change le point de vue / la direction d'observation.
    void rotation( const float x, const float y );
    //! deplace le centre / le point observe.
    void translation( const float x, const float y );
    //! rapproche / eloigne la camera du centre.
    void move( const float z );
    
    //! renvoie la transformation vue.
    Transform view( ) const;
    //! renvoie la transformation projection actuelle. doit etre initialise par projection(width, height, fov).
    Transform projection( ) const;
    //! renvoie la transformation viewport actuelle. doit etre initialise par projection(width, height, fov).
    Transform viewport( ) const;
    
    /*! renvoie les coordonnees de l'origine d0 et les axes dx, dy du plan image dans le repere du monde. 
    permet de construire un rayon pour le pixel x, y : 
        - l'extremite : un point dans le plan image avec z = 1 : 
        \code
            Point d1;
            Vector dx1, dy1;
            camera.projection(width, height, fov);
            camera.frame(1, d1, dx1, dy1);
            Point e= d1 + x*dx1 + y*dy1;
        \endcode
        - l'origine : 
        \code
            Point o= camera.position();
        \endcode
        
    ou autre solution, reproduire la projection openGL :
        - extremite : un point dans le plan image avec z = 1 :  
        \code
            Point d1;
            Vector dx1, dy1;
            camera.projection(width, height, fov);
            camera.frame( 1, d1, dx1, dy1);
            Point e= d1 + x*dx1 + y*dy1;
        \endcode
        - origine : un point dans le plan image avec z = 0 :
        \code
            Point d0;
            Vector dx0, dy0;
            camera.projection(width, height, fov);
            camera.frame(0, d0, dx0, dy0);
            Point o= d0 + x*dx0 + y*dy0;
        \endcode
     */
    void frame( const float z, Point& dO, Vector& dx, Vector& dy ) const;

    //! renvoie la position de la camera dans le repere du monde.
    Point position( );
    
    //! relit la position de l'orbiter depuis un fichier texte. 
    int read_orbiter( const char *filename );

    //! enregistre la position de l'orbiter dans un fichier texte.
    int write_orbiter( const char *filename );
    
    //! renvoie le rayon de la scene.
    float radius() const { return m_radius;  }
    
protected:
    Point m_center;
    vec2 m_position;
    vec2 m_rotation;
    float m_size;
    float m_radius;
    
    float m_width;
    float m_height;
    float m_fov;
};

///@}
#endif
