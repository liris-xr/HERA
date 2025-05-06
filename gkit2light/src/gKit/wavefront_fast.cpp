
#include <cstdio>
#include <ctype.h>
#include <climits>

#include <map>
#include <algorithm>

#include "files.h"
#include "wavefront.h"
#include "wavefront_fast.h"

// parse_int() + parse_float() + tools from fast_obj parser
// https://github.com/thisistherk/fast_obj 
int is_whitespace( const char c )
{
    return (c == ' ' || c == '\t' || c == '\r');
}

int is_digit( const char c )
{
    return (c >= '0' && c <= '9');
}

int is_exponent( const char c )
{
    return (c == 'e' || c == 'E');
}

const char* skip_whitespace( const char* ptr )
{
    while (is_whitespace(*ptr))
        ptr++;

    return ptr;
}

const char* parse_int( const char* ptr, int* val )
{
    ptr = skip_whitespace(ptr);
    
    int sign= 0;
    if (*ptr == '-')
    {
        sign = -1;
        ptr++;
    }
    else
    {
        sign = +1;
    }

    int num = 0;
    while (is_digit(*ptr))
        num = 10 * num + (*ptr++ - '0');

    *val = sign * num;
    return ptr;
}

/* Max supported power when parsing float */
#define MAX_POWER               20

static const
double POWER_10_POS[MAX_POWER] =
{
    1.0e0,  1.0e1,  1.0e2,  1.0e3,  1.0e4,  1.0e5,  1.0e6,  1.0e7,  1.0e8,  1.0e9,
    1.0e10, 1.0e11, 1.0e12, 1.0e13, 1.0e14, 1.0e15, 1.0e16, 1.0e17, 1.0e18, 1.0e19,
};

static const
double POWER_10_NEG[MAX_POWER] =
{
    1.0e0,   1.0e-1,  1.0e-2,  1.0e-3,  1.0e-4,  1.0e-5,  1.0e-6,  1.0e-7,  1.0e-8,  1.0e-9,
    1.0e-10, 1.0e-11, 1.0e-12, 1.0e-13, 1.0e-14, 1.0e-15, 1.0e-16, 1.0e-17, 1.0e-18, 1.0e-19,
};

const char* parse_float(const char* ptr, float* val)
{
    ptr = skip_whitespace(ptr);

    double sign= 0;
    switch (*ptr)
    {
    case '+':
        sign = 1.0;
        ptr++;
        break;

    case '-':
        sign = -1.0;
        ptr++;
        break;

    default:
        sign = 1.0;
        break;
    }

    double num= 0.0;
    while (is_digit(*ptr))
        num = 10.0 * num + (double)(*ptr++ - '0');

    if (*ptr == '.')
        ptr++;

    double fra= 0;
    double div= 1;
    while (is_digit(*ptr))
    {
        fra  = 10.0 * fra + (double)(*ptr++ - '0');
        div *= 10.0;
    }

    num += fra / div;

    if (is_exponent(*ptr))
    {
        ptr++;

        const double* powers= nullptr;
        switch (*ptr)
        {
        case '+':
            powers = POWER_10_POS;
            ptr++;
            break;

        case '-':
            powers = POWER_10_NEG;
            ptr++;
            break;

        default:
            powers = POWER_10_POS;
            break;
        }

        unsigned int eval= 0;
        while (is_digit(*ptr))
            eval = 10 * eval + (*ptr++ - '0');

        num *= (eval >= MAX_POWER) ? 0.0 : powers[eval];
    }

    *val = (float)(sign * num);
    return ptr;
}


Mesh read_mesh_fast( const char *filename )
{
    FILE *in= fopen(filename, "rb");
    if(in == NULL)
    {
        printf("[error] loading mesh '%s'...\n", filename);
        return Mesh::error();
    }
    
    Mesh data(GL_TRIANGLES);
    
    printf("loading mesh '%s'...\n", filename);
    
    std::vector<vec3> positions;
    std::vector<vec2> texcoords;
    std::vector<vec3> normals;
    int material_id= -1;
    
    std::vector<int> idp;
    std::vector<int> idt;
    std::vector<int> idn;
    
    char tmp[1024*64];
    char line_buffer[1024*64];
    bool error= true;
    for(;;)
    {
        // charge une ligne du fichier
        if(fgets(line_buffer, sizeof(line_buffer), in) == NULL)
        {
            error= false;       // fin du fichier, pas d'erreur detectee
            break;
        }
        
        // force la fin de la ligne, au cas ou
        line_buffer[sizeof(line_buffer) -1]= 0;
        
        // saute les espaces en debut de ligne
        const char *line= skip_whitespace(line_buffer);
        if(line[0] == 'v')
        {
            float x, y, z;
            if(line[1] == ' ')          // position x y z
            {
                line+= 2;
                line= parse_float(line, &x);
                line= parse_float(line, &y);
                line= parse_float(line, &z);
                
                positions.push_back( vec3(x, y, z) );
            }
            else if(line[1] == 'n')     // normal x y z
            {
                line+= 3;
                line= parse_float(line, &x);
                line= parse_float(line, &y);
                line= parse_float(line, &z);
                
                normals.push_back( vec3(x, y, z) );
            }
            else if(line[1] == 't')     // texcoord x y
            {
                line+= 3;
                line= parse_float(line, &x);
                line= parse_float(line, &y);
                
                texcoords.push_back( vec2(x, y) );
            }
        }
        
        else if(line[0] == 'f')         // triangle a b c, les sommets sont numerotes a partir de 1 ou de la fin du tableau (< 0)
        {
            idp.clear();
            idt.clear();
            idn.clear();
            
            line+= 2;
            while(*line)
            {
                idp.push_back(0); 
                idt.push_back(0); 
                idn.push_back(0);         // 0: invalid index
                
                line= parse_int(line, &idp.back());
                if(*line == '/')
                {
                    line++;
                    if(*line != '/')
                        line= parse_int(line, &idt.back());
                    
                    if(*line == '/')
                    {
                        line++;
                        line= parse_int(line, &idn.back());
                    }
                }
                
                while(isspace(*line))
                    line++;
            }
        
            // verifie qu'une matiere est deja definie pour le triangle
            if(material_id == -1)
                // sinon affecte une matiere par defaut
                material_id= data.materials().default_material_index();
            
            data.material(material_id);
            
            // triangulation de la face (supposee convexe)
            for(int v= 2; v < int(idp.size()); v++)
            {
                int idv[3]= { 0, v -1, v };
                for(int i= 0; i < 3; i++)
                {
                    int k= idv[i];
                    int p= (idp[k] < 0) ? (int) positions.size() + idp[k] : idp[k] -1;
                    int t= (idt[k] < 0) ? (int) texcoords.size() + idt[k] : idt[k] -1;
                    int n= (idn[k] < 0) ? (int) normals.size()   + idn[k] : idn[k] -1;
                    
                    if(p < 0) break; // error
                    if(t >= 0) data.texcoord(texcoords[t]);
                    if(n >= 0) data.normal(normals[n]);
                    data.vertex(positions[p]);
                }
            }
        }
        
        else if(line[0] == 'm')
        {
           if(sscanf(line, "mtllib %[^\r\n]", tmp) == 1)
           {
               Materials materials= read_materials( normalize_filename(pathname(filename) + tmp).c_str() );
               // enregistre les matieres dans le mesh
               data.materials(materials);
           }
        }
        
        else if(line[0] == 'u')
        {
           if(sscanf(line, "usemtl %[^\r\n]", tmp) == 1)
               material_id= data.materials().find(tmp);
        }
    }
    
    fclose(in);
    
    if(error)
        printf("[error] loading mesh '%s'...\n%s\n\n", filename, line_buffer);
    else
        printf("mesh '%s': %d positions %s %s\n", filename, int(data.positions().size()), data.has_texcoord() ? "texcoord" : "", data.has_normal() ? "normal" : "");
    
    return data;
}


//! representation de l'indexation complete d'un sommet
struct vertex
{
    int material;
    int position;
    int texcoord;
    int normal;
    
    vertex( ) : material(-1), position(-1), texcoord(-1), normal(-1) {}
    vertex( const int m, const int p, const int t, const int n ) : material(m), position(p), texcoord(t), normal(n) {}
    
    // comparaison lexicographique de 2 sommets / des indices de leurs attributs
    bool operator< ( const vertex& b ) const
    {
        if(material != b.material) return material < b.material;
        if(position != b.position) return position < b.position;
        if(texcoord != b.texcoord) return texcoord < b.texcoord;
        if(normal != b.normal) return normal < b.normal;
        return false;
    }
};


Mesh read_indexed_mesh_fast( const char *filename )
{
    FILE *in= fopen(filename, "rb");
    if(in == NULL)
    {
        printf("[error] loading indexed mesh '%s'...\n", filename);
        return Mesh::error();
    }
    
    Mesh data(GL_TRIANGLES);
    
    printf("loading indexed mesh '%s'...\n", filename);
    
    std::vector<vec3> positions;
    std::vector<vec2> texcoords;
    std::vector<vec3> normals;
    int material_id= -1;
    
    std::vector<int> idp;
    std::vector<int> idt;
    std::vector<int> idn;
    
    std::map<vertex, int> remap;
    
    char tmp[1024*64];
    char line_buffer[1024*64];
    bool error= true;
    for(;;)
    {
        // charge une ligne du fichier
        if(fgets(line_buffer, sizeof(line_buffer), in) == NULL)
        {
            error= false;       // fin du fichier, pas d'erreur detectee
            break;
        }
        
        // force la fin de la ligne, au cas ou
        line_buffer[sizeof(line_buffer) -1]= 0;
        
        // saute les espaces en debut de ligne
        const char *line= skip_whitespace(line_buffer);
        if(line[0] == 'v')
        {
            float x, y, z;
            if(line[1] == ' ')          // position x y z
            {
                line+= 2;
                line= parse_float(line, &x);
                line= parse_float(line, &y);
                line= parse_float(line, &z);
                
                positions.push_back( vec3(x, y, z) );
            }
            else if(line[1] == 'n')     // normal x y z
            {
                line+= 3;
                line= parse_float(line, &x);
                line= parse_float(line, &y);
                line= parse_float(line, &z);
                
                normals.push_back( vec3(x, y, z) );
            }
            else if(line[1] == 't')     // texcoord x y
            {
                line+= 3;
                line= parse_float(line, &x);
                line= parse_float(line, &y);
                
                texcoords.push_back( vec2(x, y) );
            }
        }
        
        else if(line[0] == 'f')         // triangle a b c, les sommets sont numerotes a partir de 1 ou de la fin du tableau (< 0)
        {
            idp.clear();
            idt.clear();
            idn.clear();
            
            line+= 2;
            while(*line)
            {
                idp.push_back(0); 
                idt.push_back(0); 
                idn.push_back(0);         // 0: invalid index
                
                line= parse_int(line, &idp.back());
                if(*line == '/')
                {
                    line++;
                    if(*line != '/')
                        line= parse_int(line, &idt.back());
                    
                    if(*line == '/')
                    {
                        line++;
                        line= parse_int(line, &idn.back());
                    }
                }
              
                while(isspace(*line))
                    line++;
            }
            
            // force une matiere par defaut, si necessaire
            if(material_id == -1)
            {
                material_id= data.materials().default_material_index();
                printf("usemtl default\n");
            }
            
            data.material(material_id);
            
            // triangule la face
            for(int v= 2; v < int(idp.size()); v++)
            {
                int idv[3]= { 0, v -1, v };
                for(int i= 0; i < 3; i++)
                {
                    int k= idv[i];
                    // indices des attributs du sommet
                    int p= (idp[k] < 0) ? (int) positions.size() + idp[k] : idp[k] -1;
                    int t= (idt[k] < 0) ? (int) texcoords.size() + idt[k] : idt[k] -1;
                    int n= (idn[k] < 0) ? (int) normals.size()   + idn[k] : idn[k] -1;
                    
                    if(p < 0) break; // error
                    
                    // recherche / insere le sommet 
                    auto found= remap.insert( std::make_pair(vertex(material_id, p, t, n), int(remap.size())) );
                    if(found.second)
                    {
                        // pas trouve, copie les nouveaux attributs
                        if(t != -1) data.texcoord(texcoords[t]);
                        if(n != -1) data.normal(normals[n]);
                        data.vertex(positions[p]);
                    }
                    
                    // construit l'index buffer
                    data.index(found.first->second);
                }
            }
        }
        
        else if(line[0] == 'm')
        {
           if(sscanf(line, "mtllib %[^\r\n]", tmp) == 1)
           {
               Materials materials= read_materials( normalize_filename(pathname(filename) + tmp).c_str() );
               // enregistre les matieres dans le mesh
               data.materials(materials);
           }
        }
        
        else if(line[0] == 'u')
        {
           if(sscanf(line, "usemtl %[^\r\n]", tmp) == 1)
               material_id= data.materials().find(tmp);
        }
    }
    
    fclose(in);
    
    if(error)
        printf("[error] loading indexed mesh '%s'...\n%s\n\n", filename, line_buffer);
    else
        printf("  %d indices, %d positions %d texcoords %d normals\n", 
            int(data.indices().size()), int(data.positions().size()), int(data.texcoords().size()), int(data.normals().size()));
    
    return data;
}
