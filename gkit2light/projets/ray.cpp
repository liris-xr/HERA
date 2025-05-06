
//! \file tuto_rayons.cpp

#include <cmath>
#include <vector>
#include <cfloat>
#include <chrono>
#include <random>

#include "vec.h"
#include "mat.h"
#include "color.h"
#include "image.h"
#include "image_io.h"
#include "image_hdr.h"
#include "orbiter.h"
#include "mesh.h"
#include "wavefront.h"
#include <gltf.h>

const int N = 256;

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
    int id;             // indice du triangle
    
    Triangle( const TriangleData& data, const int _id ) : p(data.a), e1(Vector(data.a, data.b)), e2(Vector(data.a, data.c)), id(_id) {}
    
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
};

// renvoie la normale au point d'intersection
Vector normal( const Mesh& mesh, const Hit& hit )
{
    // recuperer le triangle du mesh
    const TriangleData& data= mesh.triangle(hit.triangle_id);
    
    // interpoler la normale avec les coordonn�es barycentriques du point d'intersection
    float w= 1 - hit.u - hit.v;
    Vector n= w * Vector(data.na) + hit.u * Vector(data.nb) + hit.v * Vector(data.nc);
    return normalize(n);
}



int main( const int argc, const char **argv )
{
    const char *mesh_filename= "data/cornell_box-_original.glb";
    if(argc > 1)
        mesh_filename= argv[1];
        
    const char *orbiter_filename= "data/cornell_orbiter.txt";
    if(argc > 2)
        orbiter_filename= argv[2];
    
    Orbiter camera;
    if(camera.read_orbiter(orbiter_filename) < 0)
        return 1;

    Mesh mesh= read_gltf_mesh(mesh_filename);
    
    // recupere les triangles dans le mesh
    std::vector<Triangle> triangles;
    int n= mesh.triangle_count();
    std::cout<<"nb triangles : "<<n<<std::endl;
    for(int i= 0; i < n; i++) {
        TriangleData t = mesh.triangle(i);
        triangles.emplace_back(t, i);
    }
    

    // recupere les transformations pour generer les rayons
    // camera.projection(image.width(), image.height(), 45);
    // Transform model= Identity();
    // Transform view= camera.view();
    // Transform projection= camera.projection();
    // Transform viewport= camera.viewport();
    // Transform inv= Inverse(viewport * projection * view * model);
    
    auto start= std::chrono::high_resolution_clock::now();
    
    // #pragma omp parallel for
    // // Boucle sur les probes
    //     Vector n= normal(mesh, hit);
    //     Vector Y = Vector(0,1,0);

    //     Color color;
    //     Point p = ray.point(hit.t) + n *0.001;

    //     for(int i = 0;i<N;i++) {



    //         /* GENERATION ALEATOIRE SUR LA SOURCE DE LUMIERE */

    //         // On sélectionne un triangle aléatoire, en fonction de sa taille
    //         std::discrete_distribution<unsigned int> dd(ls.weights.begin(),ls.weights.end());

    //         float r1 = uniform(rng)/2;
    //         float r2 = uniform(rng)/2;

    //         unsigned int triangleId = dd(rng);
    //         TriangleData t = mesh.triangle(ls.triangleIds[triangleId]);
    //         Point lightP = Point (Vector(t.a) 
    //                 + ( (Vector(t.b) - Vector(t.a)) * r1 )
    //                 + ( (Vector(t.c) - Vector(t.a)) * r2 )) + Vector(t.na) *0.001;

    //         float pdf = (1/ls.area) * (float(1)/ls.triangleIds.size());
    //         Color materialColor = mesh.triangle_material(hit.triangle_id).diffuse;
    //         Color lightColor = mesh.triangle_material(ls.triangleIds[triangleId]).emission/30;
    //         float isVisible = M_PI;
            
    //         Vector l = p - lightP;
    //         float closestT = length(l);
    //         l = normalize(l);
    //         Ray r(lightP,l);

    //         for(int j= 0; j < int(triangles.size()); j++)
    //         { 
    //             if(Hit h= triangles[j].intersect(r, r.tmax))
    //             {
    //                 // ne conserve que l'intersection *valide* la plus proche de l'origine du rayon
    //                 if(closestT > h.t) { // Si on a trouvé une intersection plus proche
    //                     lightColor = Color(0,0,0);
    //                     isVisible = 0;
    //                     break;
    //                 }
    //             }
    //         }

    //         color = color + (materialColor * isVisible * dot(-l,normalize(n)) )/pdf;
    //     // normale interpolee a l'intersection
    //     image(x, y)= color/(float(N));
    // }

    auto stop= std::chrono::high_resolution_clock::now();
    int cpu= std::chrono::duration_cast<std::chrono::milliseconds>(stop - start).count();
    printf("%dms\n", cpu);
    return 0;
}
