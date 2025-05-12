#ifndef _LIGHT_SOURCES_H
#define _LIGHT_SOURCES_H

#include "mesh.h"
#include "vec.h"
#include <random>
#include <vector>
#include "gltf.h"

// Tableau des triangles émissifs de la scène
// + Tableau de pondération en fonction de la taille des triangles
class LightSources {  
    private:
    
        std::vector<unsigned int> triangleIds;
        std::vector<float> weights;
        std::vector<Color> triangleColor;
        float area;

        std::discrete_distribution<unsigned int> dd;

        
        
    public:
        LightSources(const Mesh & mesh,const std::vector<GLTFMaterial> & materials);
        ~LightSources();
        
        unsigned int getRandomWeightedLightSourceId();
        unsigned int getTriangleId(unsigned int lightSourceId);
        Color getTriangleColor(unsigned int lightSourceId);

};

#endif