#ifndef _LIGHT_SOURCES_H
#define _LIGHT_SOURCES_H

#include "mesh.h"
#include "vec.h"
#include <vector>

// Tableau des triangles émissifs de la scène
// + Tableau de pondération en fonctiond de la taille des triangles
class LightSources {  
    private:
    
        std::vector<unsigned int> triangleIds;
        std::vector<float> weights;
        std::vector<TriangleData> triangles;
        float area;
        
        unsigned int getRandomWeightedTriangleId();
    
    public:
        LightSources(Mesh mesh);
        ~LightSources();

        Point getRandomPoint();

};

#endif