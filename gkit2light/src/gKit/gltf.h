
//! \file gltf.h scene glTF.

#ifndef _GLTF_MESH_H
#define _GLTF_MESH_H

#include <vector>

#include "vec.h"
#include "color.h"
#include "mesh.h"
#include "image_io.h"


//! charge un fichier .gltf et construit un mesh statique, sans animation.
Mesh read_gltf_mesh( const char *filename );

//! description d'une camera.
struct GLTFCamera
{
    float fov;
    float aspect;
    float znear;
    float zfar;
    
    Transform view;
    Transform projection;
};

//! charge un fichier .gltf renvoie les cameras.
std::vector<GLTFCamera> read_gltf_cameras( const char *filename );

//! description d'une source de lumiere.
struct GLTFLight
{
    Point position;
    Color emission;
    float intensity;
    
    // \todo transform et les autres parametres...
};

//! charge un fichier .gltf et renvoie les sources de lumiere ponctuelles.
std::vector<GLTFLight> read_gltf_lights( const char *filename );

/*! description d'une matiere PBR / Principled BRDF. 

    cf specification glTF / implementation : https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#appendix-b-brdf-implementation
    
    utilise les extensions / parametres supplementaires :\n
        - KHR_materials_ior : https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_ior
        - KHR_materials_specular : https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_specular
        - KHR_materials_transmission : https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_transmission
        
        - KHR_materials_clearcoat : https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_clearcoat
 */

struct GLTFMaterial
{
    Color color;                    //!< base color.
    Color emission;                 //!< emission pour les sources de lumieres ou pas (= noir).
    float metallic;                 //!< metallic / dielectrique.
    float roughness;                //!< rugosite de la micro surface.
    float transmission;             //!< transmission, transparent ou pas (= 0)
    float ior;                      //!< indice de refraction des dielectriques ou pas (= 0)
    float specular;                 //!< modification de la reflexion speculaire des dielectriques ou pas (= 0)
    Color specular_color;           //!< modification de la reflexion speculaire des dielectriques ou pas (= 0)
    float thickness;                //!< epaisseur des surfaces transparentes
    float attenuation_distance;     //!< 
    Color attenuation_color;        //!< 
    // \todo coating
    
    int color_texture;              //!< indice de la texture ou -1. cf read_gltf_images() pour charger les textures dans le bon ordre...
    int metallic_roughness_texture; //!< indice de la texture ou -1. les valeurs RGB representent les parametres du modele : B= metallic, G= roughness, et R= ambient occlusion.
    int emission_texture;           //!< indice de la texture ou -1.
    int occlusion_texture;          //!< indice de la texture ou -1.    // \todo probablement pas necessaire, cf canal rouge de metallic_roughness_texture
    int normal_texture;             //!< indice de la texture ou -1.
    int transmission_texture;       //!< indice de la texture ou -1.
    int specular_texture;           //!< indice de la texture ou -1.
    int specular_color_texture;     //!< indice de la texture ou -1.
    int thickness_texture;
    
    GLTFMaterial( ) :
        color(White()), emission(), metallic(), roughness(0.8), transmission(), ior(), specular(), specular_color(), thickness(), attenuation_distance(), attenuation_color(), 
        color_texture(-1), metallic_roughness_texture(-1), emission_texture(-1), occlusion_texture(-1), normal_texture(-1),
        transmission_texture(-1), specular_texture(-1), specular_color_texture(-1), thickness_texture(-1)
    {}
};

//! charge un fichier .gltf et renvoie les matieres.
std::vector<GLTFMaterial> read_gltf_materials( const char *filename );

//! charge un fichier .gltf et charge les images referencees par les matieres.
std::vector<ImageData> read_gltf_images( const char *filename );


//! groupe de triangles d'un maillage. chaque groupe est associe a une matiere.
struct GLTFPrimitives
{
    int primitives_mode;    //!< triangles.
    int primitives_index;   //!< indice unique.
    int material_index;     //!< indice de la matiere des primitives.
    
    Point pmin, pmax;        //!< points extremes de l'englobant dans le repere objet
    
    // buffers...
    std::vector<unsigned> indices;
    std::vector<vec3> positions;
    std::vector<vec2> texcoords;
    std::vector<vec3> normals;
};

//! description d'un maillage.
struct GLTFMesh
{
    std::vector<GLTFPrimitives> primitives; //!< groupes de triangles associes a une matiere.
    Point pmin, pmax;        //!< points extremes de l'englobant dans le repere objet
};

//! instances d'un maillage.
struct GLTFInstances
{
    std::vector<Transform> transforms;      //!< transformation model de chaque instance
    int mesh_index;                         //!< indice du maillage instancie.
};

//! position et orientation d'un maillage dans la scene.
struct GLTFNode
{
    Transform model;                        //!< transformation model pour dessiner le maillage.
    int mesh_index;                         //!< indice du maillage.
};


/*! representation d'une scene statique glTF.

    resume du format glTF : https://github.com/KhronosGroup/glTF-Tutorials/blob/master/gltfTutorial/README.md
    
    specification complete : https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
    
    parser gltf : https://github.com/jkuhlmann/cgltf
    
    une scene est un ensemble de maillages places et orientes dans un repere.
    un GLTFNode permet de dessiner un maillage GLTFMesh a sa place.
    un maillage est un ensemble de groupes de triangles / primitives. cf GLTFPrimitives.
    un groupe de primitives est associe a une matiere. cf GLTFMaterial.
 */
struct GLTFScene
{
    std::vector<GLTFMesh> meshes;           //!< ensemble de maillages.
    std::vector<GLTFNode> nodes;            //!< noeuds / position et orientation des maillages dans la scene.
    
    std::vector<GLTFMaterial> materials;    //!< matieres.
    std::vector<GLTFLight> lights;          //!< lumieres.
    std::vector<GLTFCamera> cameras;        //!< cameras.
    
    void bounds( Point& pmin, Point& pmax) const;   //!< calcule les points extremes de la scene, utile pour regler un orbiter.
    std::vector<GLTFInstances> instances( ) const;  //!< regroupe les instances de chaque maillage.
};

//! charge un fichier .gltf et construit une scene statique, sans animation.
GLTFScene read_gltf_scene( const char *filename );

#endif

