
#include <cstdio>
#include <cstring>
#include <cfloat>

#include "files.h"
#include "texture.h"
#include "image_io.h"

#include "cgltf.h"
#include "gltf.h"

#include "SDL2/SDL_rwops.h"
#include "SDL2/SDL_surface.h"
#include "SDL2/SDL_image.h"



Mesh read_gltf_mesh( const char *filename )
{
    printf("loading glTF mesh '%s'...\n", filename);
    
    cgltf_options options= { };
    cgltf_data *data= nullptr;
    cgltf_result code= cgltf_parse_file(&options, filename, &data);
    if(code != cgltf_result_success)
    {
        printf("[error] loading glTF mesh '%s'...\n", filename);
        return Mesh::error();
    }
    
    if(cgltf_validate(data) != cgltf_result_success)
    {
        printf("[error] invalid glTF mesh '%s'...\n", filename);
        return Mesh::error();
    }
    
    code= cgltf_load_buffers(&options, data, filename);
    if(code != cgltf_result_success)
    {
        printf("[error] loading glTF buffers...\n");
        return Mesh::error();
    }
    
    // 
    std::vector<unsigned> indices;
    std::vector<int> material_indices;
    std::vector<vec3> positions;
    std::vector<vec2> texcoords;
    std::vector<vec3> normals;
    std::vector<vec4> colors;
    
    Materials materials;
    
    // textures
    for(unsigned i= 0; i < data->images_count; i++)
    {
        if(data->images[i].uri)
        {
            printf("texture '%s'...\n", data->images[i].uri);
            materials.insert_texture(data->images[i].uri);
        }
        else if(data->images[i].buffer_view)
        {
            //~ cgltf_buffer_view *view= data->images[i].buffer_view;
            //~ assert(view->buffer->data);
            //~ printf("  [%u] %s offset %lu size %lu, type '%s'\n", i, data->images[i].name, view->offset, view->size, data->images[i].mime_type);
            
            //~ SDL_RWops *read= SDL_RWFromConstMem((uint8_t *) view->buffer->data + view->offset, view->size);
            //~ assert(read);        
        
            // extraire la texture du glb...
            
            cgltf_buffer_view *view= data->images[i].buffer_view;
            //~ printf("buffer %d/%d, offset %lu size %lu\n", int(std::distance(data->buffers, view->buffer)), int(data->buffers_count), view->offset, view->size);
            //~ printf("  type '%s'\n", data->images[i].mime_type);
            
            if(!view->buffer->uri)
            {
                char tmp[1024];
                if(data->images[i].name && data->images[i].name[0])
                    sprintf(tmp, "%s%s", pathname(filename).c_str(), data->images[i].name);
                else
                    sprintf(tmp, "%stexture%d.png", pathname(filename).c_str(), i);
                
                printf("packed texture '%s'...\n", tmp);
                materials.insert_texture(tmp);
            
            #if 0
                if(strcmp(data->images[i].mime_type, "image/png") == 0)
                    strcat(tmp, ".png");
                else if(strcmp(data->images[i].mime_type, "image/jpg") == 0)
                    strcat(tmp, ".jpg");
                else 
                    strcat(tmp, ".raw");        // ??
                
                printf("unpacking glb texture '%s' to '%s'...\n", data->images[i].name, tmp);
                
                FILE *out= fopen(tmp, "wb");
                if(out)
                {
                    if(fwrite((char *) view->buffer->data + view->offset, view->size, 1, out) != 1)
                        printf("[error] unpacking glb texture '%s' to '%s'...\n", data->images[i].name, tmp);
                    
                    fclose(out);
                }
                
                // ultra moche, utiliser les RWops de sdl... pour lire l'image directement en memoire...
                // retourner l'image, origine en bas a gauche pour opengl
                ImageData image= read_image_data(tmp);
                image= flipY(image);
                
                if(char *ext= strrchr(tmp, '.'))
                    strcpy(ext, "_flip.png");
                
                printf("writing flipped texture '%s'...\n", tmp);
                write_image_data(image, tmp);
                
                materials.insert_texture(tmp);
                assert(data->images[i].uri == nullptr);
                data->images[i].uri= strdup(tmp);       // nomme la texture / cf analyse des matieres
            #endif
            }
        }
    }
    
    // materials
    for(unsigned i= 0; i < data->materials_count; i++)
    {
        cgltf_material *material= &data->materials[i];
        //~ printf("materials[%u]: '%s'\n", i, material->name);
        
        Material m(Color(0.8));
        if(material->has_pbr_metallic_roughness)
        {
            cgltf_pbr_metallic_roughness *pbr= &material->pbr_metallic_roughness;
            //~ printf("  pbr metallic roughness\n");
            //~ printf("    base color %f %f %f %f\n", pbr->base_color_factor[0], pbr->base_color_factor[1], pbr->base_color_factor[2], pbr->base_color_factor[3]);
            //~ printf("      texture %d\n", pbr->base_color_texture.texture ? int(std::distance(data->images, pbr->base_color_texture.texture->image)) : -1);
            //~ printf("    metallic %f, roughness %f\n", pbr->metallic_factor, pbr->roughness_factor);
            //~ printf("      texture %d\n", pbr->metallic_roughness_texture.texture ? int(std::distance(data->images, pbr->metallic_roughness_texture.texture->image)) : -1);
            
            Color color= Color(pbr->base_color_factor[0], pbr->base_color_factor[1], pbr->base_color_factor[2], pbr->base_color_factor[3]);
            float metallic= pbr->metallic_factor;
            float roughness= pbr->roughness_factor;
            
            // conversion metallic-roughness vers diffuse-specular + Blinn-Phong
            // metaux { diffuse= black, specular= color }
            // non - metaux { diffuse= color, specular= 0.04 }
            m.diffuse= color * (1 - metallic) + metallic * Black();
            m.specular= Color(0.04) * (1 - metallic) + color * metallic;
            
            // conversion roughness vers exposant Blinn-Phong
            m.ns= 2 / (roughness * roughness * roughness * roughness) - 2;
            if(m.ns < float(1.1))
                m= Material(m.diffuse);
            // les valeurs sont habituellement dans les textures metallic_roughness... utiliser une matiere diffuse + texture...
            
            //~ printf("    | diffuse %f %f %f, specular %f %f %f, ns %f\n", 
                //~ m.diffuse.r, m.diffuse.g, m.diffuse.b,
                //~ m.specular.r, m.specular.g, m.specular.b,
                //~ m.ns);
            
            if(pbr->base_color_texture.texture && pbr->base_color_texture.texture->image)
                m.diffuse_texture= int(std::distance(data->images, pbr->base_color_texture.texture->image));
        }
        
        if(!material->name)
        {
            char tmp[1024];
            sprintf(tmp, "material%d", i);
            material->name= strdup(tmp);
        }
        
        materials.insert(m, material->name);
    }
    
    bool mesh_has_texcoords= false;
    bool mesh_has_normals= false;
    bool mesh_has_colors= false;
    
    std::vector<float> buffer;
    // parcourir les noeuds de la scene et transformer les meshs associes aux noeuds...
    for(unsigned node_id= 0; node_id < data->nodes_count; node_id++)
    {
        cgltf_node *node= &data->nodes[node_id];
        if(node->mesh== nullptr)
            // pas de mesh associe
            continue;
        
        // transformation vers la scene
        float model_matrix[16];
        cgltf_node_transform_world(node, model_matrix); // transformation globale
        
        Transform model;
        model.column_major(model_matrix);       // gltf organise les 16 floats par colonne...
        Transform normal= model.normal();       // transformation pour les normales
        //~ Transform normal= model;       // transformation pour les normales
        
        cgltf_mesh *mesh= node->mesh;
        // parcourir les groupes de triangles du mesh...
        for(unsigned primitive_id= 0; primitive_id < mesh->primitives_count; primitive_id++)
        {
            cgltf_primitive *primitives= &mesh->primitives[primitive_id];
            assert(primitives->type == cgltf_primitive_type_triangles);
            
            bool primitive_has_texcoords= false;
            bool primitive_has_normals= false;
            bool primitive_has_colors= false;
            unsigned offset= positions.size();
            
            // matiere associee au groupe de triangles
            int material_id= -1;
            if(primitives->material)
            {
                assert(material_id < materials.count());
                assert(materials.find(primitives->material->name) != -1);
                material_id= materials.find(primitives->material->name);
            }
            
            // indices
            if(primitives->indices)
            {
                for(unsigned i= 0; i < primitives->indices->count; i++)
                    indices.push_back(offset + cgltf_accessor_read_index(primitives->indices, i));
                assert(indices.size() % 3 == 0);
                
                // un indice de matiere par triplet d'indices / par triangle
                for(unsigned i= 0; i+2 < primitives->indices->count; i+= 3)
                    material_indices.push_back(material_id);
                assert(indices.size() / 3 == material_indices.size());
            }
            
            // attributs
            for(unsigned attribute_id= 0; attribute_id < primitives->attributes_count; attribute_id++)
            {
                cgltf_attribute *attribute= &primitives->attributes[attribute_id];
                
                if(attribute->type == cgltf_attribute_type_position)
                {
                    assert(attribute->data->type == cgltf_type_vec3);
                    
                    buffer.resize(cgltf_accessor_unpack_floats(attribute->data, nullptr, 0));
                    cgltf_accessor_unpack_floats(attribute->data, buffer.data(), buffer.size());
                    
                    // transforme les positions des sommets
                    for(unsigned i= 0; i+2 < buffer.size(); i+= 3)
                        positions.push_back( model(Point(buffer[i], buffer[i+1], buffer[i+2])) );
                }
                
                if(attribute->type == cgltf_attribute_type_normal)
                {
                    assert(attribute->data->type == cgltf_type_vec3);
                    
                    primitive_has_normals= true;
                    if(mesh_has_normals == false)
                    {
                        mesh_has_normals= true;
                        // insere une normale par defaut pour tous les sommets precedents...
                        for(unsigned i= 0; i < offset; i++)
                            normals.push_back( vec3() );
                    }
                    
                    buffer.resize(cgltf_accessor_unpack_floats(attribute->data, nullptr, 0));
                    cgltf_accessor_unpack_floats(attribute->data, buffer.data(), buffer.size());
                    
                    // transforme les normales des sommets
                    for(unsigned i= 0; i+2 < buffer.size(); i+= 3)
                        normals.push_back( normal(Vector(buffer[i], buffer[i+1], buffer[i+2])) );
                    //~ assert(normals.size() == positions.size());
                }
                
                if(attribute->type == cgltf_attribute_type_texcoord)
                {
                    assert(attribute->data->type == cgltf_type_vec2);
                    
                    primitive_has_texcoords= true;
                    if(mesh_has_texcoords == false)
                    {
                        mesh_has_texcoords= true;
                        // insere des texcoords par defaut pour tous les sommets precedents
                        for(unsigned i= 0; i < offset; i++)
                            texcoords.push_back( vec2() );
                    }
                    
                    buffer.resize(cgltf_accessor_unpack_floats(attribute->data, nullptr, 0));
                    cgltf_accessor_unpack_floats(attribute->data, buffer.data(), buffer.size());
                    
                    for(unsigned i= 0; i+1 < buffer.size(); i+= 2)
                        texcoords.push_back( vec2(buffer[i], buffer[i+1]) );
                    //~ assert(texcoords.size() == positions.size());
                }
                
                if(attribute->type == cgltf_attribute_type_color)
                {
                    assert(attribute->data->type == cgltf_type_vec4);
                    
                    primitive_has_colors= true;
                    if(mesh_has_colors == false)
                    {
                        mesh_has_colors= true;
                        // insere une couleur par defaut pour tous les sommtes precedents
                        for(unsigned i= 0; i < offset; i++)
                            colors.push_back( vec4(1, 1, 1, 1) );
                    }
                    
                    buffer.resize(cgltf_accessor_unpack_floats(attribute->data, nullptr, 0));
                    cgltf_accessor_unpack_floats(attribute->data, buffer.data(), buffer.size());
                    for(unsigned i= 0; i+3 < buffer.size(); i+= 4)
                        colors.push_back( vec4(buffer[i], buffer[i+1], buffer[i+2], buffer[i+3]) );
                    assert(colors.size() == positions.size());
                }
            }
            
            // complete la description des attributs par defaut...
            if(mesh_has_texcoords && primitive_has_texcoords == false)
                for(unsigned i= offset; i < positions.size(); i++)
                    texcoords.push_back( vec2() );
                    
            if(mesh_has_normals && primitive_has_normals == false)
                for(unsigned i= offset; i < positions.size(); i++)
                    normals.push_back( vec3() );
            
            if(mesh_has_colors && primitive_has_colors == false)
                for(unsigned i= offset; i < positions.size(); i++)
                    colors.push_back( vec4(1, 1, 1, 1) );
        }
    }
    
    cgltf_free(data);
    
    // reconstruit le mesh...
    Mesh mesh(GL_TRIANGLES);
    
    // 1. les sommets et les attributs, si necessaire...
    bool has_texcoords= (texcoords.size() == positions.size());
    bool has_normals= (normals.size() == positions.size());
    bool has_colors= (colors.size() == positions.size());
    
    printf("gltf %d positions, %d texcoords, %d normals\n", int(positions.size()), int(texcoords.size()), int(normals.size()));
    
    for(unsigned i= 0; i < positions.size(); i++)
    {
        if(has_texcoords) mesh.texcoord(texcoords[i]);
        if(has_normals) mesh.normal(normals[i]);
        if(has_colors) mesh.color(colors[i]);
        
        mesh.vertex(positions[i]);
    }
    
    // 2. les triangles et leurs matieres, si necessaire...
    mesh.materials(materials);
    bool has_materials= (materials.count() > 0) && (indices.size() / 3 == material_indices.size());
    for(unsigned i= 0; i+2 < indices.size(); i+= 3)
    {
        if(has_materials) mesh.material(material_indices[i / 3]);
        
        mesh.triangle(indices[i], indices[i+1], indices[i+2]);
    }
    // \bug si les triangles ne sont pas indexes, pas de matieres dans le mesh...
    
    return mesh;
}



static
std::vector<GLTFCamera> read_cameras( cgltf_data *data )
{
    std::vector<GLTFCamera> cameras;
    for(unsigned i= 0; i < data->nodes_count; i++)
    {
        cgltf_node *node= &data->nodes[i];
        if(node->camera == nullptr)
            continue;
        
        cgltf_camera_perspective *perspective= &node->camera->data.perspective;
        
        //~ if(perspective->has_aspect_ratio)
            //~ printf("  aspect ratio %f\n", perspective->aspect_ratio);
        //~ printf("  yfov %f\n", perspective->yfov);
        //~ printf("  znear %f", perspective->znear);
        //~ if(perspective->has_zfar)
            //~ printf(", zfar %f", perspective->zfar);
        //~ printf("\n");
        
        Transform projection= Perspective(degrees(perspective->yfov), perspective->aspect_ratio, perspective->znear, perspective->zfar);
        
        float model_matrix[16];
        cgltf_node_transform_world(node, model_matrix); // transformation globale
        
        Transform model;
        model.column_major(model_matrix);               // gltf organise les 16 floats par colonne...
        Transform view= Inverse(model);                 // view= inverse(model)
        
        cameras.push_back( { degrees(perspective->yfov), perspective->aspect_ratio, perspective->znear, perspective->zfar, view, projection } );
    }
    
    return cameras;
}

std::vector<GLTFCamera> read_gltf_cameras( const char *filename )
{
    printf("loading glTF camera '%s'...\n", filename);
    
    cgltf_options options= { };
    cgltf_data *data= nullptr;
    cgltf_result code= cgltf_parse_file(&options, filename, &data);
    if(code != cgltf_result_success)
    {
        printf("[error] loading glTF mesh '%s'...\n", filename);
        return {};
    }
    
    if(cgltf_validate(data) != cgltf_result_success)
    {
        printf("[error] invalid glTF mesh '%s'...\n", filename);
        return {};
    }
    
    if(data->cameras_count == 0)
    {
        printf("[warning] no camera...\n");
        return {};
    }
    
    std::vector<GLTFCamera> cameras= read_cameras(data);
    cgltf_free(data);
    return cameras;
}


static
std::vector<GLTFLight> read_lights( cgltf_data *data )
{
    std::vector<GLTFLight> lights;
    // retrouve les transformations associees aux sources
    for(unsigned i= 0; i < data->nodes_count; i++)
    {
        cgltf_node *node= &data->nodes[i];
        if(node->light == nullptr)
            continue;
        
        //~ int light_id= int(std::distance(data->lights, node->light));
        //~ printf("light[%u] attached to node[%u]...\n", light_id, i);
        
        // position de la source
        float model_matrix[16];
        cgltf_node_transform_world(node, model_matrix); // transformation globale
        
        Transform model;
        model.column_major(model_matrix);       // gltf organise les 16 floats par colonne...
        Point position= model(Origin());
        
        // proprietes de la source 
        cgltf_light *light= node->light;
        //~ printf("  position %f %f %f\n", position.x, position.y, position.z);
        //~ printf("  emission %f %f %f\n", light->color[0], light->color[1], light->color[2]);
        //~ printf("  intensity %f\n", light->intensity);
        
        lights.push_back( { position, Color(light->color[0], light->color[1], light->color[2]), light->intensity } );
    }
    
    return lights;
}

std::vector<GLTFLight> read_gltf_lights( const char *filename )
{
    printf("loading glTF lights '%s'...\n", filename);
    
    cgltf_options options= { };
    cgltf_data *data= nullptr;
    cgltf_result code= cgltf_parse_file(&options, filename, &data);
    if(code != cgltf_result_success)
    {
        printf("[error] loading glTF mesh '%s'...\n", filename);
        return {};
    }
    
    if(cgltf_validate(data) != cgltf_result_success)
    {
        printf("[error] invalid glTF mesh '%s'...\n", filename);
        return {};
    }
    
    if(data->lights_count == 0)
    {
        printf("[warning] no lights...\n");
        return {};
    }
    
    std::vector<GLTFLight> lights= read_lights(data);
    cgltf_free(data);
    return lights;
}


static
std::vector<GLTFMaterial> read_materials( cgltf_data *data )
{
    std::vector<GLTFMaterial> materials;
    for(unsigned i= 0; i < data->materials_count; i++)
    {
        cgltf_material *material= &data->materials[i];
        //~ printf("materials[%u] '%s'\n", i, material->name);
        
        GLTFMaterial m= { };
        m.color= Color(0.8, 0.8, 0.8, 1);
        m.metallic= 0;
        m.roughness= 1;
        m.transmission= 0;
        m.ior= 0;
        m.specular= 0;
        m.specular_color= Black();
        m.thickness= 0;
        m.attenuation_distance= 0;
        m.attenuation_color= Black();
        m.color_texture= -1;
        m.metallic_roughness_texture= -1;
        m.occlusion_texture= -1;
        m.normal_texture= -1;
        m.emission_texture= -1;
        m.transmission_texture= -1;
        m.specular_texture= -1;
        m.specular_color_texture= -1;
        m.thickness_texture= -1;
        
        if(material->has_pbr_metallic_roughness)
        {
            cgltf_pbr_metallic_roughness *pbr= &material->pbr_metallic_roughness;
            
            m.color= Color(pbr->base_color_factor[0], pbr->base_color_factor[1], pbr->base_color_factor[2], pbr->base_color_factor[3]);
            if(pbr->base_color_texture.texture && pbr->base_color_texture.texture->image)
                m.color_texture= int(std::distance(data->images, pbr->base_color_texture.texture->image));
            
            m.metallic= pbr->metallic_factor;
            m.roughness= pbr->roughness_factor;
            if(pbr->metallic_roughness_texture.texture && pbr->metallic_roughness_texture.texture->image)
                m.metallic_roughness_texture= int(std::distance(data->images, pbr->metallic_roughness_texture.texture->image));
                
            printf("  pbr metallic roughness\n");
            printf("    base color %f %f %f, texture %d\n", m.color.r, m.color.g, m.color.b, m.color_texture);
            printf("    metallic %f, roughness %f, texture %d\n", m.metallic, m.roughness, m.metallic_roughness_texture);
        }
        if(material->has_clearcoat)
            printf("  clearcoat\n");
        //~ if(material->has_sheen)
            //~ printf("  sheen\n");
        
        if(material->normal_texture.texture && material->normal_texture.texture->image)
        {
            //~ printf("  normal texture %d\n", int(std::distance(data->images, material->normal_texture.texture->image)));
            m.normal_texture= int(std::distance(data->images, material->normal_texture.texture->image));
        }
        
        //~ printf("  emissive color %f %f %f\n", material->emissive_factor[0], material->emissive_factor[1], material->emissive_factor[2]);
        m.emission= Color(material->emissive_factor[0], material->emissive_factor[1], material->emissive_factor[2]);
        if(material->emissive_texture.texture && material->emissive_texture.texture->image)
        {
            //~ printf("    texture %d\n", int(std::distance(data->images, material->emissive_texture.texture->image)));
            m.emission_texture= int(std::distance(data->images, material->emissive_texture.texture->image));
        }
        
        
        if(material->has_ior)
        {
            m.ior= material->ior.ior;
            if(m.ior == float(1.5))
                m.ior= 0;       // valeur par defaut
            
            if(m.ior)
                printf("    ior %f\n", m.ior);
        }
        
        if(material->has_specular)
        {
            m.specular= material->specular.specular_factor;
            if(material->specular.specular_texture.texture && material->specular.specular_texture.texture->image)
                m.specular_texture= std::distance(data->images, material->specular.specular_texture.texture->image);
            
            m.specular_color= Color(material->specular.specular_color_factor[0], material->specular.specular_color_factor[1], material->specular.specular_color_factor[2]);
            if(material->specular.specular_color_texture.texture && material->specular.specular_color_texture.texture->image)
                m.specular_color_texture= std::distance(data->images, material->specular.specular_color_texture.texture->image);
            
            if(m.specular_color.r*m.specular +m.specular_color.g*m.specular +m.specular_color.b*m.specular == 0)
            {
                // parametres incoherents... valeur par defaut / desactive ce comportement
                m.specular= 0;
                m.specular_color= Black();
            }
            
            if(m.specular)
                printf("    specular %f color %f %f %f, texture %d\n", m.specular, m.specular_color.r, m.specular_color.g, m.specular_color.b, m.specular_texture);
        }
        
        if(material->has_transmission)
        {
            m.transmission= material->transmission.transmission_factor;
            if(material->transmission.transmission_texture.texture && material->transmission.transmission_texture.texture->image)
                m.transmission_texture= std::distance(data->images, material->transmission.transmission_texture.texture->image);
            
            if(m.transmission)
                printf("    transmission %f, texture %d\n", m.transmission, m.transmission_texture);
        }
        
        if(material->has_volume)
        {
            m.thickness= material->volume.thickness_factor;
            if(material->volume.thickness_texture.texture && material->volume.thickness_texture.texture->image)
                m.thickness_texture= std::distance(data->images, material->volume.thickness_texture.texture->image);
            
            m.attenuation_distance= material->volume.attenuation_distance;
            m.attenuation_color= Color(material->volume.attenuation_color[0], material->volume.attenuation_color[1], material->volume.attenuation_color[2]);
            printf("    volume thickness %f, texture %d\n",m.thickness, m.thickness_texture);
            printf("    volume attenation distance %f, color %f %f %f\n", m.attenuation_distance, m.attenuation_color.r, m.attenuation_color.g, m.attenuation_color.b);
        }
        
        materials.push_back(m);
    }
    
    return materials;
}

std::vector<GLTFMaterial> read_gltf_materials( const char *filename )
{
    printf("loading glTF materials '%s'...\n", filename);
    
    cgltf_options options= { };
    cgltf_data *data= nullptr;
    cgltf_result code= cgltf_parse_file(&options, filename, &data);
    if(code != cgltf_result_success)
    {
        printf("[error] loading glTF mesh '%s'...\n", filename);
        return {};
    }
    
    if(cgltf_validate(data) != cgltf_result_success)
    {
        printf("[error] invalid glTF mesh '%s'...\n", filename);
        return {};
    }
    
    if(data->materials_count ==0)
    {
        printf("[warning] no materials...\n");
        return {};
    }
    
    std::vector<GLTFMaterial> materials= read_materials(data);
    cgltf_free(data);
    return materials;
}


std::vector<ImageData> read_gltf_images( const char *filename )
{
    printf("loading glTF images '%s'...\n", filename);
    
    cgltf_options options= { };
    cgltf_data *data= nullptr;
    cgltf_result code= cgltf_parse_file(&options, filename, &data);
    if(code != cgltf_result_success)
    {
        printf("[error] loading glTF mesh '%s'...\n", filename);
        return {};
    }
    
    if(cgltf_validate(data) != cgltf_result_success)
    {
        printf("[error] invalid glTF mesh '%s'...\n", filename);
        return {};
    }
    
    if(data->images_count == 0)
    {
        printf("[warning] no images...\n");
        return {};
    }
    
    // detecte s'il faut charger aussi les buffers...
    for(unsigned i= 0; i < data->images_count; i++)
        if(!data->images[i].uri)
        {
            code= cgltf_load_buffers(&options, data, filename);
            if(code != cgltf_result_success)
            {
                printf("[error] loading glTF internal images...\n");
                cgltf_free(data);
                return {};
            }
            
            break;
        }
    
    
    std::vector<ImageData> images(data->images_count);
    
#pragma omp parallel for schedule(dynamic, 1)
    for(unsigned i= 0; i < data->images_count; i++)
    {
        if(data->images[i].uri)
        {
            //~ printf("  [%u] %s\n", i, data->images[i].uri);
            std::string image_filename= pathname(filename) + std::string(data->images[i].uri);
            images[i]= read_image_data(image_filename.c_str());
        }
        else if(data->images[i].buffer_view)
        {
            // extraire l'image du glb...
            cgltf_buffer_view *view= data->images[i].buffer_view;
            assert(view->buffer->data);
            //~ printf("  [%u] %s offset %lu size %lu, type '%s'\n", i, data->images[i].name, view->offset, view->size, data->images[i].mime_type);
            
            SDL_RWops *read= SDL_RWFromConstMem((uint8_t *) view->buffer->data + view->offset, view->size);
            assert(read);
            
            images[i]= image_data( IMG_Load_RW(read, /* free RWops */ 1) );
        }
    }
    
    cgltf_free(data);
    return images;
}


GLTFScene read_gltf_scene( const char *filename )
{
    printf("loading glTF scene '%s'...\n", filename);
    
    cgltf_options options= { };
    cgltf_data *data= nullptr;
    cgltf_result code= cgltf_parse_file(&options, filename, &data);
    if(code != cgltf_result_success)
    {
        printf("[error] loading glTF mesh '%s'...\n", filename);
        return { };
    }
    
    if(cgltf_validate(data) != cgltf_result_success)
    {
        printf("[error] invalid glTF mesh '%s'...\n", filename);
        return { };
    }
    
    code= cgltf_load_buffers(&options, data, filename);
    if(code != cgltf_result_success)
    {
        printf("[error] loading glTF buffers...\n");
        return { };
    }
    
    //
    GLTFScene scene;
    
// etape 1 : construire les meshs et les groupes de triangles / primitives
    int primitives_index= 0;
    std::vector<float> buffer;
    
    // parcourir tous les meshs de la scene
    for(unsigned mesh_id= 0; mesh_id < data->meshes_count; mesh_id++)
    {
        GLTFMesh m= { };
        m.pmin= Point(FLT_MAX, FLT_MAX, FLT_MAX);
        m.pmax= Point(-FLT_MAX, -FLT_MAX, -FLT_MAX);
        
        cgltf_mesh *mesh= &data->meshes[mesh_id];
        // parcourir les groupes de triangles du mesh...
        for(unsigned primitive_id= 0; primitive_id < mesh->primitives_count; primitive_id++)
        {
            cgltf_primitive *primitives= &mesh->primitives[primitive_id];
            assert(primitives->type == cgltf_primitive_type_triangles);
            
            GLTFPrimitives p= { };
            
            // matiere associee au groupe de triangles
            p.material_index= -1;
            if(primitives->material)
                p.material_index= std::distance(data->materials, primitives->material);
            
            // indices
            if(primitives->indices)
            {
                for(unsigned i= 0; i < primitives->indices->count; i++)
                    p.indices.push_back(cgltf_accessor_read_index(primitives->indices, i));
                assert(p.indices.size() % 3 == 0);
            }
            
            // attributs
            for(unsigned attribute_id= 0; attribute_id < primitives->attributes_count; attribute_id++)
            {
                cgltf_attribute *attribute= &primitives->attributes[attribute_id];
                
                if(attribute->type == cgltf_attribute_type_position)
                {
                    assert(attribute->data->type == cgltf_type_vec3);
                    
                    buffer.resize(cgltf_accessor_unpack_floats(attribute->data, nullptr, 0));
                    cgltf_accessor_unpack_floats(attribute->data, buffer.data(), buffer.size());
                    
                    // transforme les positions des sommets
                    for(unsigned i= 0; i+2 < buffer.size(); i+= 3)
                        p.positions.push_back( vec3(buffer[i], buffer[i+1], buffer[i+2]) );
                    
                #if 0
                    assert(attribute->data->has_min);
                    assert(attribute->data->has_max);
                    p.pmin= vec3(attribute->data->min[0], attribute->data->min[1], attribute->data->min[2]);
                    p.pmax= vec3(attribute->data->max[0], attribute->data->max[1], attribute->data->max[2]);
                #else
                    p.pmin= p.positions[0];
                    p.pmax= p.positions[0];
                    for(unsigned i= 1; i < p.positions.size(); i++)
                    {
                        p.pmin= min(p.pmin, p.positions[i]);
                        p.pmax= max(p.pmax, p.positions[i]);
                    }
                #endif
                    m.pmin= min(m.pmin, p.pmin);
                    m.pmax= max(m.pmax, p.pmax);
                }
                
                if(attribute->type == cgltf_attribute_type_normal)
                {
                    assert(attribute->data->type == cgltf_type_vec3);
                    
                    buffer.resize(cgltf_accessor_unpack_floats(attribute->data, nullptr, 0));
                    cgltf_accessor_unpack_floats(attribute->data, buffer.data(), buffer.size());
                    
                    // transforme les normales des sommets
                    for(unsigned i= 0; i+2 < buffer.size(); i+= 3)
                        p.normals.push_back( vec3(buffer[i], buffer[i+1], buffer[i+2]) );
                }
                
                if(attribute->type == cgltf_attribute_type_texcoord)
                {
                    assert(attribute->data->type == cgltf_type_vec2);
                    
                    buffer.resize(cgltf_accessor_unpack_floats(attribute->data, nullptr, 0));
                    cgltf_accessor_unpack_floats(attribute->data, buffer.data(), buffer.size());
                    
                    for(unsigned i= 0; i+1 < buffer.size(); i+= 2)
                        p.texcoords.push_back( vec2(buffer[i], buffer[i+1]) );
                }
            }
            
            p.primitives_index= primitives_index++;
            m.primitives.push_back(p);
        }
        
        scene.meshes.push_back(m);
    }
    
// etape 2 : parcourir les noeuds, retrouver les transforms pour placer les meshes
    for(unsigned node_id= 0; node_id < data->nodes_count; node_id++)
    {
        cgltf_node *node= &data->nodes[node_id];
        if(node->mesh== nullptr)
            // pas de mesh associe, rien a dessiner
            continue;
        
        // recuperer la transformation pour placer le mesh dans la scene
        float model_matrix[16];
        cgltf_node_transform_world(node, model_matrix);
        
        Transform model;
        model.column_major(model_matrix);       // gltf organise les 16 floats par colonne...
        //~ Transform normal= model.normal();       // transformation pour les normales
        
        int mesh_index= std::distance(data->meshes, node->mesh);
        scene.nodes.push_back( {model, mesh_index} );
    }
    
// etape 3 : recuperer les autres infos...
    scene.materials= read_materials(data);
    scene.lights= read_lights(data);
    scene.cameras= read_cameras(data);
    
// etape : nettoyage...
    cgltf_free(data);
    
    return scene;
}

std::vector<GLTFInstances> GLTFScene::instances( ) const
{
    std::vector<GLTFInstances> instances(meshes.size());
    for(unsigned i= 0; i < meshes.size(); i++)
        instances[i].mesh_index= i;
    
    for(unsigned i= 0; i < nodes.size(); i++)
    {
        int index= nodes[i].mesh_index;
        assert(index < int(instances.size()));
        instances[index].transforms.push_back( nodes[i].model );
    }
    
    return instances;
}


void GLTFScene::bounds( Point& pmin, Point& pmax ) const
{
    pmin= Point(FLT_MAX, FLT_MAX, FLT_MAX);
    pmax= Point(-FLT_MAX, -FLT_MAX, -FLT_MAX);
    for(unsigned node_id= 0; node_id < nodes.size(); node_id++)
    {
        const GLTFNode& node= nodes[node_id];
        const GLTFMesh& mesh= meshes[node.mesh_index];
        for(unsigned primitive_id= 0; primitive_id < mesh.primitives.size(); primitive_id++)
        {
            const GLTFPrimitives& primitives= mesh.primitives[primitive_id];
            for(unsigned i= 0; i < primitives.positions.size(); i++)
            {
                //~ Point p= node.model(Point(primitives.positions[i]));
                Point p= Point(primitives.positions[i]);
                pmin= min(pmin, p);
                pmax= max(pmax, p);
            }
        }
    }
}
