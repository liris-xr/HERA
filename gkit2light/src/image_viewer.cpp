
//! \file image_viewer.cpp permet de visualiser les images aux formats reconnus par gKit2 light bmp, jpg, tga, png, hdr, etc.

#include <cfloat>
#include <algorithm>

#include "app.h"
#include "widgets.h"

#include "files.h"
#include "image.h"
#include "image_io.h"
#include "image_hdr.h"

#include "program.h"
#include "uniforms.h"
#include "texture.h"


struct ImageViewer : public App
{
    ImageViewer( std::vector<const char *>& filenames ) : App(1024, 640), m_filenames() 
    {
        for(unsigned i= 0; i < filenames.size(); i++)
            m_filenames.push_back(filenames[i]);
    }
    
    void range( const Image& image )
    {
        int bins[100] = {};
        float ymin= FLT_MAX;
        float ymax= 0.f;
        for(int y= 0; y < image.height(); y++)
        for(int x= 0; x < image.width(); x++)
        {
            Color color= image(x, y);
            float y= color.r + color.g + color.b;
            if(y < ymin) ymin= y;
            if(y > ymax) ymax= y;
        }
        
        for(int y= 0; y < image.height(); y++)
        for(int x= 0; x < image.width(); x++)
        {
            Color color= image(x, y);
            float y= color.r + color.g + color.b;
            int b= (y - ymin) * 100.f / (ymax - ymin);
            if(b >= 99) b= 99;
            if(b < 0) b= 0;
            bins[b]++;
        }

        printf("range [%f..%f]\n", ymin, ymax);
        //~ for(int i= 0; i < 100; i++)
            //~ printf("%f ", ((float) bins[i] * 100.f / (m_width * m_height)));
        //~ printf("\n");
        
        float qbins= 0;
        for(int i= 0; i < 100; i++)
        {
            if(qbins > .75f)
            {
                m_saturation= ymin + (float) i / 100.f * (ymax - ymin);
                m_saturation_step= m_saturation / 40.f;
                m_saturation_max= ymax;
                break;
            }
            
            qbins= qbins + (float) bins[i] / (m_width * m_height);
        }
        m_compression= 2.2f;        
    }
    
    Image tone( const Image& image, const float saturation, const float gamma )
    {
        Image tmp(image.width(), image.height());
        
        float invg= 1 / gamma;
        float k= 1 / std::pow(saturation, invg);
        for(unsigned i= 0; i < image.size(); i++)
        {
            Color color= image(i);
            if(std::isnan(color.r) || std::isnan(color.g) || std::isnan(color.b))
                // marque les pixels pourris avec une couleur improbable...            
                color= Color(1, 0, 1);
            else
                // sinon transformation gamma rgb -> srgb
                color= Color(k * std::pow(color.r, invg), k * std::pow(color.g, invg), k * std::pow(color.b, invg));
            
            tmp(i)= Color(color, 1);
        }
        
        return tmp;
    }
    
    Image gray( const Image& image )
    {
        Image tmp(image.width(), image.height());
        
        for(unsigned i= 0; i < image.size(); i++)
        {
            Color color= image(i);
            float g= (color.r + color.b + color.b) / 3;
            //~ float g= std::max(color.r, std::max(color.g, std::max(color.b, float(0))));
            tmp(i)= Color(g);
        }
        
        return tmp;
    }
    
    
    void title( const int index )
    {
        char tmp[1024];
        sprintf(tmp, "buffer %02d: %s", index, m_filenames[index].c_str());
        SDL_SetWindowTitle(m_window, tmp);        
    }
    
    Image read( const char *filename )
    {
        Image image;
        if(is_pfm_image(filename))
            image= read_image_pfm(filename);
        else if(is_hdr_image(filename))
            image= read_image_hdr(filename);
        else
            image= read_image(filename);
        
        return image;
    }
    
    int init( )
    {
        m_width= 0;
        m_height= 0;
        
        for(unsigned i= 0; i < m_filenames.size(); i++)
        {
            printf("loading buffer %u...\n", i);
            
            Image image= read(m_filenames[i].c_str());
            if(image.size() == 0)
                continue;
            
            m_images.push_back(image);
            m_times.push_back(timestamp(m_filenames[i].c_str()));
            
            m_textures.push_back(make_texture(0, image));
            
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_BORDER);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_BORDER);
            
            m_width= std::max(m_width, image.width());
            m_height= std::max(m_height, image.height());
        }
        
        if(m_images.empty())
        {
            printf("no image...\n");
            return -1;
        }
        
        // change le titre de la fenetre
        title(0);
        
        // redminsionne la fenetre
        SDL_SetWindowSize(m_window, m_width, m_height);
        
        glGenVertexArrays(1, &m_vao);
        glBindVertexArray(m_vao);
        
        m_program= read_program( smart_path("data/shaders/tonemap.glsl") );
        program_print_errors(m_program);
        
        // 
        m_red= 1;
        m_green= 1;
        m_blue= 1;
        m_alpha= 1;
        m_gray= 0;
        m_smooth= 1;
        m_difference= 0;
        m_compression= 2.2f;
        m_saturation= 1;
        m_saturation_step= 1;
        m_saturation_max= 1000;
        m_index= 0;
        m_reference_index= -1;
        m_zoom= 4;
        m_graph= 0;
        
        // parametres d'exposition / compression
        range(m_images.front());
        
        //
        m_widgets= create_widgets();
        
        //
        glGenSamplers(1, &m_sampler_nearest);
        glSamplerParameteri(m_sampler_nearest, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        glSamplerParameteri(m_sampler_nearest, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        glSamplerParameteri(m_sampler_nearest, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_BORDER);
        glSamplerParameteri(m_sampler_nearest, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_BORDER);
        
        // etat openGL par defaut
        glUseProgram(0);
        glBindVertexArray(0);
        glBindTexture(GL_TEXTURE_2D, 0);
        
        glDisable(GL_DEPTH_TEST);
        glDisable(GL_CULL_FACE);
        return 0;
    }
    
    int quit( )
    {
        glDeleteVertexArrays(1, &m_vao);
        glDeleteTextures(m_textures.size(), m_textures.data());
        
        release_program(m_program);
        release_widgets(m_widgets);
        return 0;
    }
    
    int render( )
    {
        // effacer l'image
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        
        if(key_state('r'))
        {
            clear_key_state('r');
            reload_program(m_program, smart_path("data/shaders/tonemap.glsl") );
            program_print_errors(m_program);
        }
        
        if(key_state(SDLK_LEFT))
        {
            clear_key_state(SDLK_LEFT);
            m_index= (m_index -1 + m_textures.size()) % m_textures.size();
            // change aussi le titre de la fenetre
            title(m_index);
        }
        
        if(key_state(SDLK_RIGHT))
        {
            clear_key_state(SDLK_RIGHT);
            m_index= (m_index +1 + m_textures.size()) % m_textures.size();
            // change aussi le titre de la fenetre
            title(m_index);
        }
        
        // verification de la date de l'image
        static float last_time= 0;
        // quelques fois par seconde, ca suffit, pas tres malin de le faire 60 fois par seconde...
        if(global_time() > last_time + 400)
        {
            size_t time= timestamp(m_filenames[m_index].c_str());
            if(time != m_times[m_index])
            {
                // date modifiee, recharger l'image
                printf("reload image '%s'...\n", m_filenames[m_index].c_str());
                
                Image image= read(m_filenames[m_index].c_str());
                if(image.size())
                {
                    m_times[m_index]= time;
                    m_images[m_index]= image;
                    
                    // transfere la nouvelle version
                    glBindTexture(GL_TEXTURE_2D, m_textures[m_index]);
                    glTexImage2D(GL_TEXTURE_2D, 0,
                        GL_RGBA32F, image.width(), image.height(), 0,
                        GL_RGBA, GL_FLOAT, image.data());
                    
                    glGenerateMipmap(GL_TEXTURE_2D);
                }
            }
            
            last_time= global_time();
        }
        
        if(drop_events().size())
        {
            for(unsigned i= 0; i < drop_events().size(); i++)
            {
                const char *filename= drop_events()[i].c_str();
                if(filename && filename[0])
                {
                    //~ printf("drop file [%d] '%s'...\n", int(m_filenames.size()), filename);
                    
                    Image image= read(filename);
                    if(image.size())
                    {
                        m_images.push_back( image );
                        m_filenames.push_back( filename );
                        m_times.push_back( timestamp(filename) );
                        m_textures.push_back( make_texture(0, image) );
                        
                        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_BORDER);
                        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_BORDER);
                    }
                }
                
                printf("index %d\n", m_index);
                for(unsigned i= 0; i < m_filenames.size(); i++)
                    printf("images[%d] '%s'\n", i, m_filenames[i].c_str());
            }
            
            clear_drop_events();
            assert(drop_events().size() == 0);
        }
        
        
        int xmouse, ymouse;
        unsigned int bmouse= SDL_GetMouseState(&xmouse, &ymouse);
        
        glBindVertexArray(m_vao);
        glUseProgram(m_program);
        
        // selection des buffers + filtrage
        GLuint sampler= 0;
        if(!m_smooth)
            sampler= m_sampler_nearest;
        
        program_use_texture(m_program, "image", 0, m_textures[m_index], sampler);
        if(m_reference_index == -1)
            program_use_texture(m_program, "image_next", 1, m_textures[(m_index +1) % m_textures.size()], sampler);
        else
            program_use_texture(m_program, "image_next", 1, m_textures[m_reference_index], sampler);
        
        // activer le split de l'ecran
        if(bmouse & SDL_BUTTON(1))
            program_uniform(m_program, "split", (int) xmouse);
        else
            program_uniform(m_program, "split", (int) window_width() +2);
        
        // parametres
        program_uniform(m_program, "channels", Color(m_red, m_green, m_blue, m_alpha));
        program_uniform(m_program, "gray", float(m_gray));
        program_uniform(m_program, "difference", float(m_difference));
        program_uniform(m_program, "compression", m_compression);
        program_uniform(m_program, "saturation", m_saturation);
        
        // zoom
        if(bmouse & SDL_BUTTON(3))
        {
            SDL_MouseWheelEvent wheel= wheel_event();
            if(wheel.y != 0)
            {
                m_zoom= m_zoom + float(wheel.y) / 4.f;
                if(m_zoom < .1f) m_zoom= .1f;
                if(m_zoom > 10.f) m_zoom= 10.f;
            }
        }
    
        program_uniform(m_program, "center", vec2( float(xmouse) / float(window_width()), float(window_height() - ymouse -1) / float(window_height())));
        if(bmouse & SDL_BUTTON(3))
            program_uniform(m_program, "zoom", m_zoom);
        else
            program_uniform(m_program, "zoom", 1.f);
        
        // graphes / courbes
        if(key_state('g'))
        {
            clear_key_state('g');
            m_graph= (m_graph +1) % 2;
        }

        program_uniform(m_program, "graph", int(m_graph));
        program_uniform(m_program, "line", vec2(float(window_height() - ymouse -1) / float(window_height()), float(window_height() - ymouse -1)));
        
        // dessine 1 triangle plein ecran
        glDrawArrays(GL_TRIANGLES, 0, 3);
        
        // actions
        if(key_state('c'))
        {
            clear_key_state('c');
            
            // change l'extension
            std::string file= m_filenames[m_index];
            size_t ext= file.rfind(".");
            if(ext != std::string::npos)
                file= file.substr(0, ext) + "-tone.png";
            
            printf("writing '%s'...\n", file.c_str());
            screenshot(file.c_str());
        }
        
        begin(m_widgets);
            value(m_widgets, "saturation", m_saturation, 0.f, m_saturation_max*10, m_saturation_step);
            value(m_widgets, "compression", m_compression, .1f, 10.f, .1f);
        
            int reset= 0; 
            button(m_widgets, "reset", reset);
            if(reset) range(m_images[m_index]);

            int reload= 0; 
            button(m_widgets, "reload", reload);
            if(reload)
            {
                Image image= read(m_filenames[m_index].c_str());
                {
                    m_images[m_index]= image;
                    m_times[m_index]= timestamp(m_filenames[m_index].c_str());
                    
                    // transfere la nouvelle version
                    glBindTexture(GL_TEXTURE_2D, m_textures[m_index]);
                    glTexImage2D(GL_TEXTURE_2D, 0,
                        GL_RGBA32F, image.width(), image.height(), 0,
                        GL_RGBA, GL_FLOAT, image.data());
                    
                    glGenerateMipmap(GL_TEXTURE_2D);                    
                }
            }
            
            int reference= (m_index == m_reference_index) ? 1 : 0;
            if(button(m_widgets, "reference", reference))
            {
                if(reference) m_reference_index= m_index;       // change de reference
                else m_reference_index= -1;     // deselectionne la reference
            }
        
            int export_all= 0;
            button(m_widgets, "export all", export_all);
            if(export_all)
            {
                #pragma omp parallel for
                for(unsigned i= 0; i < m_images.size(); i++)
                {
                    Image image;
                    if(m_gray)
                        image= tone(gray(m_images[i]), m_saturation, m_compression);
                    else
                        image= tone(m_images[i], m_saturation, m_compression);
                    
                    char filename[1024];
                    sprintf(filename, "%s-tone.png", m_filenames[i].c_str());
                    printf("exporting '%s'...\n", filename);
                    write_image(image, filename);
                }
            }
            
        begin_line(m_widgets);
        {
            int px= xmouse;
            int py= window_height() - ymouse -1;
            float x= px / float(window_width()) * m_images[m_index].width();
            float y= py / float(window_height()) * m_images[m_index].height();
            Color pixel= m_images[m_index](x, y);
            label(m_widgets, "pixel %d %d: %f %f %f", int(x), int(y), pixel.r, pixel.g, pixel.b);
        }

        begin_line(m_widgets);
            button(m_widgets, "R", m_red);
            button(m_widgets, "G", m_green);
            button(m_widgets, "B", m_blue);
            button(m_widgets, "A", m_alpha);
            button(m_widgets, "gray", m_gray);
            button(m_widgets, "smooth", m_smooth);
            
            if(m_reference_index != -1)
                button(m_widgets, "diff to reference", m_difference);
        
        begin_line(m_widgets);
        {
            static int list= 0;
            button(m_widgets, "select image...", list);
            if(list)
            {
                char tmp[1024];
                for(unsigned i= 0; i < m_filenames.size(); i++)
                {
                    begin_line(m_widgets);
                    sprintf(tmp, "[%u] %s", i, m_filenames[i].c_str());
                    select(m_widgets, tmp, i, m_index);
                }
            }
        }
        
        end(m_widgets);
        
        draw(m_widgets, window_width(), window_height());
        
        if(key_state('s'))
        {
            clear_key_state('s');
            
            static int calls= 0;
            screenshot("screenshot", ++calls);
            printf("screenshot %d...\n", calls);
        }
        
        if(key_state(SDLK_LCTRL) && key_state('w'))
        {
            clear_key_state('w');
            
            m_filenames.erase(m_filenames.begin() + m_index);
            m_times.erase(m_times.begin() + m_index);
            m_images.erase(m_images.begin() + m_index);
            m_textures.erase(m_textures.begin() + m_index);
            if(m_reference_index == m_index)
                m_reference_index= -1;
            
            if(m_textures.empty())
                return 0;
            
            m_index= m_index % int(m_textures.size());
            // change aussi le titre de la fenetre
            title(m_index);
        }
        
        return 1;
    }
    
protected:
    Widgets m_widgets;
    
    std::vector<std::string> m_filenames;
    std::vector<size_t> m_times;
    std::vector<Image> m_images;
    std::vector<GLuint> m_textures;
    int m_width, m_height;
    
    GLuint m_program;
    GLuint m_vao;
    GLuint m_sampler_nearest;
    
    int m_red, m_green, m_blue, m_alpha, m_gray;
    int m_smooth;
    int m_difference;
    
    float m_compression;
    float m_saturation;
    float m_saturation_step;
    float m_saturation_max;

    float m_zoom;
    int m_index;
    int m_reference_index;
    int m_graph;
};


int main( int argc, char **argv )
{
    if(argc == 1)
    {
        printf("usage: %s image.[bmp|png|jpg|tga|hdr]\n", argv[0]);
        return 0;
    }
    
    std::vector<const char *> options(argv +1, argv + argc);
    ImageViewer app(options);
    app.run();
    
    return 0;
}
