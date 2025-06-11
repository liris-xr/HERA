#ifndef _OCTAHEDRON_H
#define _OCTAHEDRON_H

#include "vec.h"
#include <map>

// Source : https://handmade.network/p/75/monter/blog/p/7288-engine_work__global_illumination_with_irradiance_probes
// The 9 points of the octahedron are 
// G H I
// D E F
// A B C
// (easier to understand with the linked source)

class Octahedron {
    private:
        std::map<std::string, Vector> octahedronPoints;
        std::map<std::string, Vector> triangleVectors;
        unsigned int size;
        int halfSize;

    public:
        Octahedron(unsigned int size);

        Vector getVector(unsigned int i, unsigned int j);
};

#endif
