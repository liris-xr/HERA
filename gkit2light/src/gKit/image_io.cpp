
#include <cstdio>
#include <string>
#include <algorithm>
#include <cmath>

#ifdef GK_MACOS
#include <SDL2_image/SDL_image.h>
#include <SDL2_image/SDL_surface.h>
#else
#include <SDL2/SDL_image.h>
#include <SDL2/SDL_surface.h>
#endif

#include "image_io.h"


Image read_image( const char *filename )
{
    // importer le fichier en utilisant SDL_image
    SDL_Surface *surface= IMG_Load(filename);
    if(surface == NULL)
    {
        printf("[error] loading image '%s'... sdl_image failed.\n", filename);
        return Image::error();
    }
    
    // verifier le format, rgb ou rgba
    const SDL_PixelFormat format= *surface->format;
    int width= surface->w;
    int height= surface->h;
    int channels= format.BitsPerPixel / 8;
    
    printf("loading image '%s' %dx%d %d channels...\n", filename, width, height, channels);
    
    Image image(surface->w, surface->h);
    // converti les donnees en pixel rgba, et retourne l'image, origine en bas a gauche.
    if(format.BitsPerPixel == 32)
    {
        int py= 0;
        for(int y= height -1; y >= 0; y--, py++)
        {
            Uint8 *pixel= (Uint8 *) surface->pixels + py * surface->pitch;

            for(int x= 0; x < width; x++)
            {
                Uint8 r= pixel[format.Rshift / 8];
                Uint8 g= pixel[format.Gshift / 8];
                Uint8 b= pixel[format.Bshift / 8];
                Uint8 a= pixel[format.Ashift / 8];

                image(x, y)= Color((float) r / 255.f, (float) g / 255.f, (float) b / 255.f, (float) a / 255.f);
                pixel= pixel + format.BytesPerPixel;
            }
        }
    }

    else
    {
        int py= 0;
        for(int y= height -1; y >= 0; y--, py++)
        {
            Uint8 *pixel= (Uint8 *) surface->pixels + py * surface->pitch;

            for(int x= 0; x < surface->w; x++)
            {
                Uint8 r= 0;
                Uint8 g= 0;
                Uint8 b= 0;
                if(format.BitsPerPixel >=  8) { r= pixel[format.Rshift / 8]; g= r; b= r; }      // rgb= rrr
                if(format.BitsPerPixel >= 16) { g= pixel[format.Gshift / 8]; b= 0; }    // rgb= rg0
                if(format.BitsPerPixel >= 24) { b= pixel[format.Bshift / 8]; }  // rgb

                image(x, y)= Color((float) r / 255.f, (float) g / 255.f, (float) b / 255.f);
                pixel= pixel + format.BytesPerPixel;
            }
        }
    }

    SDL_FreeSurface(surface);
    return image;
}


int write_image( const Image& image, const char *filename )
{
    if(std::string(filename).rfind(".png") == std::string::npos && std::string(filename).rfind(".bmp") == std::string::npos )
    {
        printf("[error] writing color image '%s'... not a .png / .bmp image.\n", filename);
        return -1;
    }

    // flip de l'image : Y inverse entre GL et BMP
    std::vector<Uint8> flip(image.width() * image.height() * 4);

    int p= 0;
    for(int y= 0; y < image.height(); y++)
    for(int x= 0; x < image.width(); x++)
    {
        Color color= image(x, image.height() - y -1);
        Uint8 r= (Uint8) std::min(std::floor(color.r * 255.f), 255.f);
        Uint8 g= (Uint8) std::min(std::floor(color.g * 255.f), 255.f);
        Uint8 b= (Uint8) std::min(std::floor(color.b * 255.f), 255.f);
        Uint8 a= (Uint8) std::min(std::floor(color.a * 255.f), 255.f);

        flip[p]= r;
        flip[p +1]= g;
        flip[p +2]= b;
        flip[p +3]= a;
        p= p + 4;
    }

    SDL_Surface *surface= SDL_CreateRGBSurfaceFrom((void *) &flip.front(), image.width(), image.height(),
        32, image.width() * 4,
#if 0
        0xFF000000,
        0x00FF0000,
        0x0000FF00,
        0x000000FF
#else
        0x000000FF,
        0x0000FF00,
        0x00FF0000,
        0xFF000000
#endif
    );

    int code= -1;
    if(std::string(filename).rfind(".png") != std::string::npos)
        code= IMG_SavePNG(surface, filename);
    else if(std::string(filename).rfind(".bmp") != std::string::npos)
        code= SDL_SaveBMP(surface, filename);

    SDL_FreeSurface(surface);
    if(code < 0)
        printf("[error] writing color image '%s'...\n%s\n", filename, SDL_GetError());
    return code;
}


ImageData image_data( SDL_Surface *surface )
{
    if(!surface)
    {
        //~ printf("loading image...\n");
        return {};
    }
    
    // verifier le format, rgb ou rgba
    SDL_PixelFormat format= *surface->format;
    
    int width= surface->w;
    int height= surface->h;
    int channels= format.BitsPerPixel / 8;
    
    if(channels < 3) channels= 3;
    ImageData image(width, height, channels);
    
    //~ printf("loading image %dx%d %d channels...\n", width, height, channels);

    // converti les donnees en pixel rgba, et retourne l'image, origine en bas a gauche.
    if(format.BitsPerPixel == 32)
    {
        int py= 0;
        for(int y= height -1; y >= 0; y--, py++)
        {
            Uint8 *pixel= (Uint8 *) surface->pixels + py * surface->pitch;
            
            for(int x= 0; x < width; x++)
            {
                Uint8 r= pixel[format.Rshift / 8];
                Uint8 g= pixel[format.Gshift / 8];
                Uint8 b= pixel[format.Bshift / 8];
                Uint8 a= pixel[format.Ashift / 8];
                
                std::size_t offset= image.offset(x, y);
                image.pixels[offset]= r;
                image.pixels[offset +1]= g;
                image.pixels[offset +2]= b;
                image.pixels[offset +3]= a;
                pixel= pixel + format.BytesPerPixel;
            }
        }
    }

    else 
    {
        int py= 0;
        for(int y= height -1; y >= 0; y--, py++)
        {
            Uint8 *pixel= (Uint8 *) surface->pixels + py * surface->pitch;
            
            for(int x= 0; x < surface->w; x++)
            {
                Uint8 r= 0;
                Uint8 g= 0;
                Uint8 b= 0;
                
                if(format.BitsPerPixel >=  8) { r= pixel[format.Rshift / 8]; g= r; b= r; }      // rgb= rrr
                if(format.BitsPerPixel >= 16) { g= pixel[format.Gshift / 8]; b= 0; }    // rgb= rg0
                if(format.BitsPerPixel >= 24) { b= pixel[format.Bshift / 8]; }  // rgb
                
                std::size_t offset= image.offset(x, y);
                image.pixels[offset]= r;
                image.pixels[offset +1]= g;
                image.pixels[offset +2]= b;
                pixel= pixel + format.BytesPerPixel;
            }
        }
    }
    
    SDL_FreeSurface(surface);
    return image;
}

ImageData read_image_data( const char *filename )
{
    // importer le fichier en utilisant SDL_image
    SDL_Surface *surface= IMG_Load(filename);
    if(surface == NULL)
    {
        printf("[error] loading image '%s'... sdl_image failed.\n%s\n", filename, SDL_GetError());
        return ImageData();
    }
    
    return image_data(surface);
}

int write_image_data( ImageData& image, const char *filename )
{
    if(std::string(filename).rfind(".png") == std::string::npos && std::string(filename).rfind(".bmp") == std::string::npos )
    {
        printf("[error] writing color image '%s'... not a .png / .bmp image.\n", filename);
        return -1;
    }

    if(image.size != 1)
    {
        printf("[error] writing color image '%s'... not an 8 bits image.\n", filename);
        return -1;
    }

    // flip de l'image : origine en bas a gauche
    std::vector<Uint8> flip(image.width * image.height * 4);

    int p= 0;
    for(int y= 0; y < image.height; y++)
    for(int x= 0; x < image.width; x++)
    {
        std::size_t offset= image.offset(x, image.height - y -1);
        Uint8 r= image.pixels[offset];
        Uint8 g= image.pixels[offset +1];
        Uint8 b= image.pixels[offset +2];
        Uint8 a= 255;
        if(image.channels > 3)
            a= image.pixels[offset +3];
        
        flip[p]= r;
        flip[p +1]= g;
        flip[p +2]= b;
        flip[p +3]= a;
        p= p + 4;
    }

    // construit la surface sdl
    SDL_Surface *surface= SDL_CreateRGBSurfaceFrom((void *) &flip.front(), image.width, image.height,
        32, image.width * 4,
#if 0
        0xFF000000,
        0x00FF0000,
        0x0000FF00,
        0x000000FF
#else
        0x000000FF,
        0x0000FF00,
        0x00FF0000,
        0xFF000000
#endif
    );

    // enregistre le fichier
    int code= -1;
    if(std::string(filename).rfind(".png") != std::string::npos)
        code= IMG_SavePNG(surface, filename);
    else if(std::string(filename).rfind(".bmp") != std::string::npos)
        code= SDL_SaveBMP(surface, filename);

    SDL_FreeSurface(surface);
    if(code < 0)
        printf("[error] writing color image '%s'...\n%s\n", filename, SDL_GetError());
    return code;
}


Image flipY( const Image& image )
{
    // flip de l'image : origine en haut a gauche
    Image flip(image.width(), image.height());

    for(int y= 0; y < image.height(); y++)
    for(int x= 0; x < image.width(); x++)
    {
        size_t s= image.offset(x, y);
        size_t d= flip.offset(x, flip.height() - y -1);
        
        flip(d)= image(s);
    }

    return flip;
}

Image flipX( const Image& image )
{
    Image flip(image.width(), image.height());

    for(int y= 0; y < image.height(); y++)
    for(int x= 0; x < image.width(); x++)
    {
        size_t s= image.offset(x, y);
        size_t d= flip.offset(flip.width() -x -1, y);
        
        flip(d)= image(s);
    }

    return flip;
}

Image copy( const Image& image, const int xmin, const int ymin, const int width, const int height )
{
    Image copy(width, height);
    
    for(int y= 0; y < height; y++)
    for(int x= 0; x < width; x++)
    {
        size_t s= image.offset(xmin+x, ymin+y);
        size_t d= copy.offset(x, y);
        
        copy(d)= image(s);
    }
    
    return copy;
}


ImageData flipY( const ImageData& image )
{
    // flip de l'image : origine en haut a gauche
    ImageData flip(image.width, image.height, image.channels);

    for(int y= 0; y < image.height; y++)
    for(int x= 0; x < image.width; x++)
    {
        size_t s= image.offset(x, y);
        size_t d= flip.offset(x, flip.height - y -1);
        
        for(int i= 0; i < image.channels; i++)
            flip.pixels[d+i]= image.pixels[s+i];
    }

    return flip;
}

ImageData flipX( const ImageData& image )
{
    ImageData flip(image.width, image.height, image.channels);

    for(int y= 0; y < image.height; y++)
    for(int x= 0; x < image.width; x++)
    {
        size_t s= image.offset(x, y);
        size_t d= flip.offset(flip.width -x -1, y);
        
        for(int i= 0; i < image.channels; i++)
            flip.pixels[d+i]= image.pixels[s+i];
    }

    return flip;
}

ImageData copy( const ImageData& image, const int xmin, const int ymin, const int width, const int height )
{
    ImageData copy(width, height, image.channels);
    
    for(int y= 0; y < height; y++)
    for(int x= 0; x < width; x++)
    {
        size_t s= image.offset(xmin+x, ymin+y);
        size_t d= copy.offset(x, y);
        
        for(int i= 0; i < image.channels; i++)
            copy.pixels[d+i]= image.pixels[s+i];
    }
    
    return copy;
}

ImageData downscale( const ImageData& image )
{
    ImageData mip(std::max(1, image.width/2), std::max(1, image.height/2), image.channels);
    
    for(int y= 0; y < mip.height; y++)
    for(int x= 0; x < mip.width; x++)
    {
        size_t d= mip.offset(x, y);
        for(int i= 0; i < image.channels; i++)
            mip.pixels[d+i]= (
                    image.pixels[image.offset(2*x, 2*y)+i] 
                + image.pixels[image.offset(2*x+1, 2*y)+i] 
                + image.pixels[image.offset(2*x, 2*y+1)+i] 
                + image.pixels[image.offset(2*x+1, 2*y+1)+i] ) / 4;
    }
    
    return mip;
}

Image downscale( const Image& image )
{
    Image mip(std::max(1, image.width()/2), std::max(1, image.height()/2));
    
    for(int y= 0; y < mip.height(); y++)
    for(int x= 0; x < mip.width(); x++)
        mip(x, y)= (image(2*x, 2*y) + image(2*x+1, 2*y)
            + image(2*x, 2*y+1) + image(2*x+1, 2*y+1)) / 4;
    
    return mip;
}


