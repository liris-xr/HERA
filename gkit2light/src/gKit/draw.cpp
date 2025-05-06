
#include "draw.h"
#include "window.h"
#include "program.h"
#include "uniforms.h"

//avec texture
void draw( Mesh& m, const Transform& model, const Transform& view, const Transform& projection, const GLuint texture )
{
    DrawParam param;
    param.model(model).view(view).projection(projection);
    param.texture(texture);
    param.draw(m);
}

void draw( Mesh& m, const Transform& model, Orbiter& camera, const GLuint texture )
{
    // recupere les transformations
    Transform view= camera.view();
    Transform projection= camera.projection(window_width(), window_height(), 45);
    
    // affiche l'objet
    draw(m, model, view, projection, texture);
}

void draw( Mesh& m, Orbiter& camera, const GLuint texture )
{
    draw(m, Identity(), camera, texture);
}


// sans texture
void draw( Mesh& m, const Transform& model, const Transform& view, const Transform& projection )
{
    DrawParam param;
    param.model(model).view(view).projection(projection);
    param.draw(m);
}

void draw( Mesh& m, const Transform& model, Orbiter& camera )
{
    // recupere les transformations
    Transform view= camera.view();
    Transform projection= camera.projection(window_width(), window_height(), 45);
    
    // affiche l'objet
    draw(m, model, view, projection);
}

void draw( Mesh& m, Orbiter& camera )
{
    // affiche l'objet
    draw(m, Identity(), camera);
}


// groupe de triangles + matiere, sans texture
void draw( const TriangleGroup& group, Mesh& m, const Transform& model, const Transform& view, const Transform& projection )
{
    DrawParam param;
    param.model(model).view(view).projection(projection);
    param.draw(group, m);
}    

void draw( const TriangleGroup& group, Mesh& m, const Transform& model, Orbiter& camera )
{
    // recupere les transformations
    Transform view= camera.view();
    Transform projection= camera.projection(window_width(), window_height(), 45);
    
    // dessine les triangles
    draw(group, m, model, view, projection);
}

void draw( const TriangleGroup& group, Mesh& m, Orbiter& camera )
{
    draw(group, m, Identity(), camera);
}


// groupe de triangles + matiere et texture
void draw( const TriangleGroup& group, Mesh& m, const Transform& model, const Transform& view, const Transform& projection, const GLuint texture )
{
    DrawParam param;
    param.model(model).view(view).projection(projection);
    param.texture(texture);    
    param.draw(group, m);
}

void draw( const TriangleGroup& group, Mesh& m, const Transform& model, Orbiter& camera, const GLuint texture )
{
    // recupere les transformations
    Transform view= camera.view();
    Transform projection= camera.projection(window_width(), window_height(), 45);
    
    // dessine les triangles
    draw(group, m, model, view, projection, texture);
}

void draw( const TriangleGroup& group, Mesh& m, Orbiter& camera, const GLuint texture )
{
    draw(group, m, Identity(), camera, texture);
}


void draw( Mesh& m, DrawParam& param )
{
    param.draw(m);
}


GLuint DrawParam::create_program( const GLenum primitives, const bool use_texcoord, const bool use_normal, const bool use_color, const bool use_light, const bool use_alpha_test )
{
    std::string definitions;

    if(use_texcoord)
        definitions.append("#define USE_TEXCOORD\n");
    if(use_normal)
        definitions.append("#define USE_NORMAL\n");
    if(use_color)
        definitions.append("#define USE_COLOR\n");
    if(use_light)
        definitions.append("#define USE_LIGHT\n");
    if(use_texcoord && use_alpha_test)
        definitions.append("#define USE_ALPHATEST\n");

    //~ printf("--\n%s", definitions.c_str());
    const char *filename= smart_path("data/shaders/mesh.glsl");
    bool use_mesh_color= (primitives == GL_POINTS || primitives == GL_LINES || primitives == GL_LINE_STRIP || primitives == GL_LINE_LOOP);
    if(use_mesh_color) 
        filename= smart_path("data/shaders/mesh_color.glsl");
    
    PipelineProgram *program= PipelineCache::manager().find(filename, definitions.c_str());
    return program->program;
}

GLuint DrawParam::create_debug_normals_program( const GLenum primitives, const bool use_texcoord, const bool use_normal, const bool use_color, const bool use_light, const bool use_alpha_test )
{
    const char *filename= smart_path("data/shaders/normals.glsl");
    bool use_mesh_color= (primitives == GL_POINTS || primitives == GL_LINES || primitives == GL_LINE_STRIP || primitives == GL_LINE_LOOP);
    if(use_mesh_color) 
        // pas la peine, les normales ne sont definies que pour les triangles...
        return 0;
    
    PipelineProgram *program= PipelineCache::manager().find(filename);
    return program->program;
}

GLuint DrawParam::create_debug_texcoords_program( const GLenum primitives, const bool use_texcoord, const bool use_normal, const bool use_color, const bool use_light, const bool use_alpha_test )
{
    const char *filename= smart_path("data/shaders/texcoords.glsl");
    PipelineProgram *program= PipelineCache::manager().find(filename);
    return program->program;
}


void DrawParam::draw( Mesh& mesh )
{
    bool use_texcoord= m_use_texture && m_texture > 0 && mesh.has_texcoord();
    bool use_normal= mesh.has_normal();
    bool use_color= mesh.has_color();

    Transform mv= m_view * m_model;
    Transform mvp= m_projection * mv;
    
    GLuint program= 0;
    if(m_debug_texcoords)
    {
        program= create_debug_texcoords_program(mesh.primitives(), use_texcoord, use_normal, use_color, m_use_light, m_use_alpha_test);
        m_use_light= false;
        m_use_texture= false;
        m_use_alpha_test= false;
        use_color= false;
        use_normal= false;
        use_texcoord= true;
        
        glUseProgram(program);
        //~ program_use_texture(program, "diffuse_color", 0, m_debug_texture);
        program_uniform(program, "mvpMatrix", mvp);
        program_uniform(program, "mvMatrix", mv);
        
        mesh.draw(program,  /* position */ true, use_texcoord, false, false, /* material_index */ false);
        return;
    }
    
    program= create_program(mesh.primitives(), use_texcoord, use_normal, use_color, m_use_light, m_use_alpha_test);
    
    glUseProgram(program);
    if(!use_color)
        program_uniform(program, "mesh_color", mesh.default_color());
    
    program_uniform(program, "mvpMatrix", mvp);
    if(use_normal)
        program_uniform(program, "normalMatrix", mv.normal()); // transforme les normales dans le repere camera.
    else
        program_uniform(program, "mvMatrix", mv);
    
    // utiliser une texture, elle ne sera visible que si le mesh a des texcoords...
    if(use_texcoord && m_texture > 0)
        program_use_texture(program, "diffuse_color", 0, m_texture);
    
    if(m_use_light)
    {
        program_uniform(program, "light", m_view(m_light));       // transforme la position de la source dans le repere camera, comme les normales
        program_uniform(program, "light_color", m_light_color);
        program_uniform(program, "mvMatrix", mv);
    }
    
    if(m_use_alpha_test)
        program_uniform(program, "alpha_min", m_alpha_min);
    
    mesh.draw(program, /* position */ true, use_texcoord, use_normal, use_color, /* material_index */ false);
    
    // dessine les normales par dessus...
    if(m_debug_normals)
    {
        program= create_debug_normals_program(mesh.primitives(), use_texcoord, use_normal, use_color, m_use_light, m_use_alpha_test);
        m_use_light= false;
        m_use_texture= false;
        m_use_alpha_test= false;
        use_color= false;
        use_normal= true;
        use_texcoord= false;
        
        static float scale= 1;
        if(key_state('p') || key_state(SDLK_KP_PLUS))
            scale+= 0.02f;
        if(key_state('m') || key_state(SDLK_KP_MINUS))
            scale-= 0.02f;
        if(scale < 0.1f)
            scale= 0.1f;
        
        glUseProgram(program);
        program_uniform(program, "mvpMatrix", mvp);
        program_uniform(program, "normalMatrix", mv.normal()); // transforme les normales dans le repere camera.
        program_uniform(program, "scale", scale * m_normals_scale);

        mesh.draw(program, /* position */ true, false, use_normal, false, /* material_index */ false);
    }
}

void DrawParam::draw( const TriangleGroup& group, Mesh& mesh )
{
    bool use_texcoord= m_use_texture && m_texture > 0 && mesh.has_texcoord();
    bool use_normal= mesh.has_normal();
    bool use_color= mesh.has_color();
    
    // etape 1 : construit le program en fonction des attributs du mesh et des options choisies
    GLuint program= create_program(mesh.primitives(), use_texcoord, use_normal, use_color, m_use_light, m_use_alpha_test);
    
    glUseProgram(program);
    if(group.index != -1 && group.index < mesh.materials().count())
        program_uniform(program, "mesh_color", mesh.materials().material(group.index).diffuse);
    else
        program_uniform(program, "mesh_color", mesh.materials().default_material().diffuse);
    
    Transform mv= m_view * m_model;
    Transform mvp= m_projection * mv;
    
    program_uniform(program, "mvpMatrix", mvp);
    if(use_normal)
        program_uniform(program, "normalMatrix", mv.normal()); // transforme les normales dans le repere camera.
    else
        program_uniform(program, "mvMatrix", mv);
        
    // utiliser une texture, elle ne sera visible que si le mesh a des texcoords...
    if(use_texcoord && m_texture > 0)
        program_use_texture(program, "diffuse_color", 0, m_texture);
    
    if(m_use_light)
    {
        program_uniform(program, "light", m_view(m_light));       // transforme la position de la source dans le repere camera, comme les normales
        program_uniform(program, "light_color", m_light_color);
        program_uniform(program, "mvMatrix", mv);
    }
    
    if(m_use_alpha_test)
        program_uniform(program, "alpha_min", m_alpha_min);
    
    mesh.draw(group.first, group.n, program, /* position */ true, use_texcoord, use_normal, use_color, /* material_index */ false);
}
