#ifndef _LIGHT_PROBE_VOLUME_H
#define _LIGHT_PROBE_VOLUME_H

#include <cfloat>
#include <random>
#include <vector>
#include "gltf.h"
#include "lightProbe.hpp"
#include "lightSources.hpp"
#include "mesh.h"
#include "vec.h"


struct Ray
{
    Point o;                // origine
    Vector d;               // direction
    float tmax;             // position de l'extremite, si elle existe. le rayon est un intervalle [0 tmax]
    
    // le rayon est un segment, on connait origine et extremite, et tmax= 1
    Ray( const Point& origine, const Point& extremite ) : o(origine), d(Vector(origine, extremite)), tmax(1) {}
    
    // le rayon est une demi droite, on connait origine et direction, et tmax= \inf
    Ray( const Point& origine, const Vector& direction ) : o(origine), d(direction), tmax(FLT_MAX) {}
    
    // renvoie le point sur le rayon pour t
    Point point( const float t ) const { return o + t * d; }
};


struct Hit
{
    float t;            // p(t)= o + td, position du point d'intersection sur le rayon
    float u, v;         // p(u, v), position du point d'intersection sur le triangle
    int triangle_id;    // indice du triangle dans le mesh
    
    Hit( ) : t(FLT_MAX), u(), v(), triangle_id(-1) {}
    Hit( const float _t, const float _u, const float _v, const int _id ) : t(_t), u(_u), v(_v), triangle_id(_id) {}
    
    // renvoie vrai si intersection
    operator bool ( ) { return (triangle_id != -1); }
};

struct Triangle
{
    Point p;            // sommet a du triangle
    Vector e1, e2;      // aretes ab, ac du triangle
    Vector n;
    int id;             // indice du triangle
    
    Triangle( const TriangleData& data, const int _id ) : p(data.a), e1(Vector(data.a, data.b)), e2(Vector(data.a, data.c)), n(normalize(cross(e1,e2))), id(_id) {}
    
    /* calcule l'intersection ray/triangle
        cf "fast, minimum storage ray-triangle intersection" 
        
        renvoie faux s'il n'y a pas d'intersection valide (une intersection peut exister mais peut ne pas se trouver dans l'intervalle [0 tmax] du rayon.)
        renvoie vrai + les coordonnees barycentriques (u, v) du point d'intersection + sa position le long du rayon (t).
        convention barycentrique : p(u, v)= (1 - u - v) * a + u * b + v * c
    */
    Hit intersect( const Ray &ray, const float tmax ) const
    {
        Vector pvec= cross(ray.d, e2);
        float det= dot(e1, pvec);
        
        float inv_det= 1 / det;
        Vector tvec(p, ray.o);
        
        float u= dot(tvec, pvec) * inv_det;
        if(u < 0 || u > 1) return Hit();        // pas d'intersection
        
        Vector qvec= cross(tvec, e1);
        float v= dot(ray.d, qvec) * inv_det;
        if(v < 0 || u + v > 1) return Hit();    // pas d'intersection
        
        float t= dot(e2, qvec) * inv_det;
        if(t > tmax || t < 0) return Hit();     // pas d'intersection
        
        return Hit(t, u, v, id);                // p(u, v)= (1 - u - v) * a + u * b + v * c
    }

    Point getRandomPointOnTriangle() const {
        std::random_device hwseed;
        std::default_random_engine rng(hwseed());

        std::uniform_real_distribution<float> uniform(0, 1);

        float r1 = uniform(rng)/2;
        float r2 = uniform(rng)/2;

        return Point (Vector(p) 
            + ( e1 * r1 )
            + ( e2 * r2 )) + Vector(n) *0.001;
    }
};

class LightProbeVolume {
    private:
        std::vector<LightProbe> probes;

        std::vector<float> shTextures[9]; // 9 textures
                                          // A pixel of a texture is a component of a spherical harmonic
        std::vector<float> invalidityTexture; // A single texture telling us how much a probe is invalid
                                              // The more a probe sees back-face, the more invalid it is

        LightSources * lightSources;
        Mesh mesh;
        std::vector<Triangle> meshTriangles;

        unsigned int nbDirectSamples;
        unsigned int nbIndirectSamples;
        unsigned int nbDirectIndirectSamples;

        float directWeight; 
        float indirectWeight; 
        float directIndrectWeight; 

        Vector getRandomSphereDirection(const Point & origin);

        bool isDirectionObstructed(const Point & origin,const Vector & direction,const float intersectionDistance);
        Hit getClosestDirectIntersection(const Point & origin,const Vector & direction,const float intersectionDistance);
        bool isBackFaceTouched(const unsigned int triangleId, const Vector & direction);

        void updateDirectLighting(LightProbe & probe);
        
    public:
        LightProbeVolume(   const Mesh & mesh,
                            const std::vector<GLTFMaterial> & materials,
                            const Point & center,
                            const float density,
                            const float width,
                            const float depth,
                            const float height,
                            const unsigned int nbDirectSamples,
                            const unsigned int nbIndirectSamples,
                            const unsigned int nbDirectIndirectSamples);
        ~LightProbeVolume();

        void bake();
        
        
};

#endif
