#ifndef _LIGHT_PROBE_VOLUME_H
#define _LIGHT_PROBE_VOLUME_H

#include <vector>
#include "lightProbe.hpp"

class LightProbeVolume {
    public:
        std::vector<LightProbe> probes;

        std::vector<float> shTextures[9];
        
        
};

#endif
