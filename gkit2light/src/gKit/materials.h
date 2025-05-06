
#ifndef _MATERIALS_H
#define _MATERIALS_H

#include <string>
#include <vector>
#include <cassert>

#include "color.h"


/*! representation d'une matiere d'un groupe de triangles d'un Mesh.
parametres des matieres Blinn-Phong, cf \ref matiere pour les explications et \ref brdf pour le code...
*/
struct Material
{
    Color diffuse;              //!< couleur diffuse / de base.
    Color specular;             //!< couleur du reflet.
    Color emission;             //!< pour une source de lumiere.
    float ns;                   //!< concentration des reflets, exposant pour les reflets blinn-phong.
    int diffuse_texture;        //!< indice de la texture de la couleur de base, ou -1.
    int specular_texture;        //!< indice de la texture, ou -1.
    int emission_texture;        //!< indice de la texture, ou -1.
    int ns_texture;             //!< indice de la texture de reflet, ou -1.
    
    //! constructeur par defaut. noir.
    Material( ) : diffuse(), specular(), emission(), ns(0), diffuse_texture(-1), specular_texture(-1), emission_texture(-1), ns_texture(-1) {}
    //! matiere diffuse.
    Material( const Color& color ) : diffuse(color), specular(), emission(), ns(0), diffuse_texture(-1), specular_texture(-1), emission_texture(-1), ns_texture(-1) {}
};


/*! ensemble de matieres d'un Mesh. + ensemble de textures referencees par les descriptions de matieres. 

    `names[id]` est le nom de la matiere `materials[id]`, utiliser name() et material() pour recuperer la description d'une matiere d'indice `id`.

    les textures sont indexees separemment. chaque matiere reference une ou plusieurs textures, par exemple diffuse_texture et specular_texture. 
    ces indices correspondent aux noms de fichiers (uniques) des images à charger : filename() renvoie le nom du fichier.
    filename( material.diffuse_texture ) renvoie le nom de l'image à charger qui correspond à la texture diffuse de la matiere.
    
    pourquoi cette indexation supplementaire ? pour eviter de charger plusieurs fois une image / creer plusieurs fois une texture. 
    il est aussi tres simple de creer un tableau avec les textures openGL indexe de la meme maniere.
*/
struct Materials
{
    std::vector<std::string> names;     //!< noms des matieres.
    std::vector<Material> materials;    //!< description des matieres.
    std::vector<std::string> texture_filenames; //!< noms des textures a charger.
    int default_material_id;    //!< indice de la matiere par defaut dans materials.
    
    Materials( ) : names(), materials(), texture_filenames(), default_material_id(-1) {}
    
    //! ajoute une matiere.
    int insert( const Material& material, const char *name )
    {
        int id= find(name);
        if(id == -1)
        {
            id= int(materials.size());
            names.push_back(name);
            materials.push_back(material);
        }
        assert(materials.size() == names.size());
        return id;
    }
    
    //! ajoute une texture / nom du fichier.
    int insert_texture( const char *filename )
    {
        int id= find_texture(filename);
        if(id == -1)
        {
            id= int(texture_filenames.size());
            texture_filenames.push_back(filename);
        }
        return id;
    }
    
    //! recherche une matiere avec son nom. renvoie son indice dans materials, ou -1.
    int find( const char *name )
    {
        if(name == nullptr || name[0] == 0)
            return -1;
        
        for(int i= 0; i < int(names.size()); i++)
        {
            if(names[i] == name)
                return i;
        }
        return -1;
    }
    
    //! nombre de matieres.
    int count( ) const { return int(materials.size()); }
    
    //! renvoie le nom de la ieme matiere.
    const char *name( const int id ) const { assert(id != -1); assert(id < int(materials.size())); return names[id].c_str(); }
    //! renvoie le nom de la ieme matiere.
    const char *name( const int id ) { assert(id != -1); assert(id < int(materials.size())); return names[id].c_str(); }
    
    //! renvoie la ieme matiere.
    const Material& material( const int id ) const { assert(id != -1); assert(id < int(materials.size())); return materials[id]; }
    //! renvoie la ieme matiere.
    Material& material( const int id ) { assert(id != -1); assert(id < int(materials.size())); return materials[id]; }
    
    //! renvoie la ieme matiere.
    const Material& operator() ( const int id ) const { return material(id); }
    //! renvoie la ieme matiere.
    Material& operator() ( const int id ) { return material(id); }
    
    //! renvoie la matiere 'name', si elle existe. ou la matiere par defaut.
    const Material& material( const char *name )
    {
        int id= find(name);
        if(id != -1)
            // renvoie la matiere
            return materials[id];
        else
            // ou renvoie la matiere par defaut...
            return default_material();
    }
    
    //! renvoie une matiere par defaut.
    const Material& default_material( )
    {
        return material(default_material_index());
    }
    
    //! indice de la matiere par defaut dans le tableau materials.
    int default_material_index( )
    {
        if(default_material_id == -1)
            default_material_id= insert(Material(Color(0.8)), "default");
        
        return default_material_id;
    }
    
    //! renvoie le nombre de noms de fichiers de textures.
    int filename_count( ) const { return int(texture_filenames.size()); }
    //! renvoie le nombre de noms de fichiers de textures.
    const char *filename( const int id ) const { return texture_filenames[id].c_str(); }
    
    //! renvoie l'indice d'une texture, si elle existe.
    int find_texture( const char *filename )
    {
        if(filename == nullptr || filename[0] == 0)
            return -1;
        
        for(int i= 0; i < int(texture_filenames.size()); i++)
        {
            if(texture_filenames[i] == filename)
                return i;
        }
        return -1;
    }
};

#endif
