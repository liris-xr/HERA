
#include "color.h"
#include "image.h"
#include "image_io.h"


int main( )
{
    // cree l'image resultat
    Image image(1024, 1024);

    // parcours tous les pixels de l'image
    for(int py= 0; py < image.height(); py++)
    for(int px= 0; px < image.width(); px++)
        image(px, py)= Red();
    
    // enregistre l'image en png
    write_image(image, "image.png");
    return 0;
}
