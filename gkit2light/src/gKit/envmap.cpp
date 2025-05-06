
#include "image_io.h"
#include "image_hdr.h"

#include "envmap.h"


Envmap read_cubemap( const char *filename )
{
    Image image;
    if(is_hdr_image(filename))
        image= read_image_hdr(filename);
    else
        image= read_image(filename);
    
    if(image.size() == 0) 
        return Envmap();
    
    return Envmap(image);
}

Envmap read_cubemap_faces( const std::array<const char *, 6>& filenames )
{
    std::array<Image, 6> faces;
    for(int i= 0; i < 6; i++)
    {
        Image image;
        if(is_hdr_image(filenames[i]))
            image= read_image_hdr(filenames[i]);
        else
            image= read_image(filenames[i]);
        
        faces[i]= image;
    }
    
    return Envmap(faces);
}

Envmap read_cubemap_faces( const char *prefix )
{
    std::array<const char *, 6> suffixes= {
        "posx",
        "negx",
        "posy", 
        "negy",
        "posz",
        "negz"
    };
    
    char tmp[1024];
    std::array<Image, 6> faces;
    for(int i= 0; i < 6; i++)
    {
        sprintf(tmp, prefix, suffixes[i]);
        
        Image image;
        if(is_hdr_image(tmp))
            image= read_image_hdr(tmp);
        else
            image= read_image(tmp);
        
        faces[i]= image;
    }
    
    return Envmap(faces);
}


int write_cubemap( const Envmap& envmap, const char *filename )
{
    Image image= envmap.cross();
    if(is_hdr_image(filename))
        return write_image_hdr(image, filename);
    else
        return write_image(image, filename);
}

int write_cubemap_faces( const Envmap& envmap, const char *prefix )
{
    std::array<const char *, 6> suffixes= {
        "posx",
        "negx",
        "posy", 
        "negy",
        "posz",
        "negz"
    };
    
    char tmp[1024];
    std::array<Image, 6> faces= envmap.faces();
    for(int i= 0; i < 6; i++)
    {
        sprintf(tmp, prefix, suffixes[i]);
        
        if(is_hdr_image(tmp))
            write_image_hdr(faces[i], tmp);
        else
            write_image(faces[i], tmp);
    }
    
    return 0;
}
