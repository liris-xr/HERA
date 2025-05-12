
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
        
    const char *orbiter_filename= "data/cornell_orbiter.txt";
    if(argc > 2)
        orbiter_filename= argv[2];
    
    float centerX = 0;
    if(argc > 3) {
        centerX = atof(argv[3]);
    }

    float centerY = 0;
    if(argc > 4) {
        centerY = atof(argv[4]);
    }

    float centerZ = 0;
    if(argc > 5) {
        centerZ = atof(argv[5]);
    }

    float density = 8;
    if(argc > 6) {
        density = atof(argv[6]);
    }

    float width = 2;
    if(argc > 7) {
        width = atof(argv[7]);
    }

    float depth = 2;
    if(argc > 8) {
        depth = atof(argv[8]);
    }

    float height = 2;
    if(argc > 9) {
        height = atof(argv[9]);
    }

    unsigned int nbDirectSamples = 16;
    if(argc > 10) {
        nbDirectSamples = atoi(argv[10]);
    }

    unsigned int nbIndirectSamples = 32;
    if(argc > 11) {
        nbIndirectSamples = atoi(argv[11]);
    }

    unsigned int nbDirectIndirectSamples = 16;
    if(argc > 12) {
        nbDirectIndirectSamples = atoi(argv[12]);
    }

    Orbiter camera;
    if(camera.read_orbiter(orbiter_filename) < 0)
        return 1;

    Mesh mesh= read_gltf_mesh(scene_filename);
    std::vector<GLTFMaterial> materials = read_gltf_materials(scene_filename);

    auto start= std::chrono::high_resolution_clock::now();

    
    LightProbeVolume lpv(mesh,materials,
            Point(centerX,centerY,centerZ),
            density,width,depth,height,
            nbDirectSamples,nbIndirectSamples,nbDirectIndirectSamples);

    lpv.bake();
    lpv.writeLPV();

    auto stop= std::chrono::high_resolution_clock::now();
    int cpu= std::chrono::duration_cast<std::chrono::milliseconds>(stop - start).count();
    printf("%dms\n", cpu);
    return 0;
}
