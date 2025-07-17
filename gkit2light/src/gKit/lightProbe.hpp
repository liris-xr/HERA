#ifndef _LIGHT_PROBE_H
#define _LIGHT_PROBE_H

#include "vec.h"
#include <vector>

float * getBasis(Vector direction);

// Source : https://github.com/mrdoob/three.js/blob/master/src/math/SphericalHarmonics3.js
class LightProbe {
    public:
        Point position;
        Vector coefficients[9];
        Vector directCoefficients[9];
        Vector indirectCoefficients[9];

        std::vector<std::vector<float>> octMap;

        Vector offset; 

        unsigned int id;
        
        unsigned int nbDisplacement;

        
        LightProbe(Point pos, unsigned int id);


        void add(const LightProbe & lp);

        void addScaled(const LightProbe & lp,const float s);

        void scale(const float s);

        float getDepth(unsigned int i, unsigned int j);

        void resetIndirectCoefficients();
};

#endif