
//! \file tuto_rayons.cpp

#include <cmath>
#include <cfloat>
#include <chrono>

#include "lightProbeVolume.hpp"
#include "vec.h"
#include "orbiter.h"
#include "mesh.h"
#include <cstdlib>
#include <gltf.h>

const int N = 256;



int main( const int argc, const char **argv )
{
    const char *scene_filename= "data/cornell_box-_original.glb";
    if(argc > 1)
        scene_filename= argv[1];
        
    float centerX = 0;
    if(argc > 2) {
        centerX = atof(argv[2]);
    }

    float centerY = 0;
    if(argc > 3) {
        centerY = atof(argv[3]);
    }

    float centerZ = 0;
    if(argc > 4) {
        centerZ = atof(argv[4]);
    }

    float density = 8;
    if(argc > 5) {
        density = atof(argv[5]);
    }

    float width = 2;
    if(argc > 6) {
        width = atof(argv[6]);
    }

    float depth = 2;
    if(argc > 7) {
        depth = atof(argv[7]);
    }

    float height = 2;
    if(argc > 8) {
        height = atof(argv[8]);
    }

    unsigned int nbDirectSamples = 16;
    if(argc > 9) {
        nbDirectSamples = atoi(argv[9]);
    }

    unsigned int nbIndirectSamples = 32;
    if(argc > 10) {
        nbIndirectSamples = atoi(argv[10]);
    }

    unsigned int nbDirectIndirectSamples = 16;
    if(argc > 11) {
        nbDirectIndirectSamples = atoi(argv[11]);
    }

    unsigned int depthMapSize = 16;
    if(argc > 12) {
        depthMapSize = atoi(argv[12]);
    }

    unsigned int nbRayPerAxis = 16;
    if(argc > 13) {
        nbRayPerAxis = atoi(argv[13]);
    }

    Mesh mesh= read_gltf_mesh(scene_filename);
    std::vector<GLTFMaterial> materials = read_gltf_materials(scene_filename);

    auto start= std::chrono::high_resolution_clock::now();

    
    LightProbeVolume lpv(mesh,materials,
            Point(centerX,centerY,centerZ),
            density,width,depth,height,
            nbDirectSamples,nbIndirectSamples,nbDirectIndirectSamples,
            depthMapSize,nbRayPerAxis);

    lpv.bake();
    lpv.writeLPV();
    lpv.writeDepthMapLayer(1);

    // std::cout << lpv.probes[0].getDepth(15,8) - lpv.probes[1].getDepth(15,8) << std::endl;
    // std::cout <<  lpv.probes[7].getDepth(15,8) - lpv.probes[8].getDepth(15,8) << std::endl;
    // std::cout << lpv.probes[1].getDepth(11,8) << std::endl;
    // std::cout << lpv.probes[17].getDepth(11,8) << std::endl;

    auto stop= std::chrono::high_resolution_clock::now();
    int cpu= std::chrono::duration_cast<std::chrono::milliseconds>(stop - start).count();
    printf("%dms\n", cpu);
    return 0;
}
