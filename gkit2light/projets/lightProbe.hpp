#ifndef _LIGHT_PROBE_H
#define _LIGHT_PROBE_H

#include "vec.h"


// Source : https://github.com/mrdoob/three.js/blob/master/src/math/SphericalHarmonics3.js
class LightProbe {
    public:
        Point position;
        Vector coefficients[9];

        LightProbe(Vector pos);

        float * getBasis(Vector direction);

        void add(LightProbe lp);

        void addScaled(LightProbe lp, float s);
};

#endif