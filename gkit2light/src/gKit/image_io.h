
#ifndef _IMAGE_IO_H
#define _IMAGE_IO_H

#ifdef GK_MACOS
#include <SDL2_image/SDL_surface.h>
#else
#include <SDL2/SDL_surface.h>
#endif

#include "image.h"


//! \addtogroup image utilitaires pour manipuler des images
///@{

//! \file
//! manipulation directe d'images

//! charge une image a partir d'un fichier. renvoie Image::error() en cas d'echec. a detruire avec image::release( ).
//! \param filemane nom de l'image a charger
Image read_image( const char *filename );

//! enregistre une image dans un fichier png.
int write_image( const Image& image, const char *filename );

//! retourne l'image
Image flipY( const Image& image );
//! retourne l'image
Image flipX( const Image& image );

//! renvoie un bloc de l'image
Image copy( const Image& image, const int xmin, const int ymin, const int width, const int height );


//! stockage temporaire des donnees d'une image.
struct ImageData
{
    ImageData( ) : pixels(), width(0), height(0), channels(0), size(0) {}
    ImageData( const int w, const int h, const int c, const int s= 1 ) : pixels(w*h*c*s, 0), width(w), height(h), channels(c), size(s) {}
    
    size_t offset( const int x, const int y, const int c= 0 ) const { return (y * width +x) * channels * size + c * size; }
    const void *data( ) const { return pixels.data(); }
    void *data( ) { return pixels.data(); }
    
    std::vector<unsigned char> pixels;
    
    int width;
    int height;
    int channels;
    int size;
};

//! converti une surface SDL en imageData, cf RWops pour charger les images deja en memoire.
ImageData image_data( SDL_Surface *surface );

//! charge les donnees d'un fichier png. renvoie une image initialisee par defaut en cas d'echec.
ImageData read_image_data( const char *filename );

//! enregistre des donnees dans un fichier png.
int write_image_data( ImageData& image, const char *filename );

//! retourne l'image
ImageData flipY( const ImageData& image );
//! retourne l'image
ImageData flipX( const ImageData& image );

//! renvoie un bloc de l'image
ImageData copy( const ImageData& image, const int xmin, const int ymin, const int width, const int height );

//! renvoie une image filtree plus petite.
ImageData downscale( const ImageData& image );

//! renvoie une image filtree plus petite.
Image downscale( const Image& image );

///@}

#endif
