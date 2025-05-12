
//! \file tuto_rayons.cpp

#include <cmath>
#include <cfloat>
#include <chrono>

#include "lightProbeVolume.hpp"
#include "vec.h"
#include "orbiter.h"
#include "mesh.h"
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
    
    Orbiter camera;
    if(camera.read_orbiter(orbiter_filename) < 0)
        return 1;

    Mesh mesh= read_gltf_mesh(scene_filename);
    std::vector<GLTFMaterial> materials = read_gltf_materials(scene_filename);

    auto start= std::chrono::high_resolution_clock::now();
    
    LightProbeVolume lpv(mesh,materials,
            Point(0,1,0),
            8,2,2,2,
            16,32,16);

    lpv.bake();
    lpv.writeLPV();

    auto stop= std::chrono::high_resolution_clock::now();
    int cpu= std::chrono::duration_cast<std::chrono::milliseconds>(stop - start).count();
    printf("%dms\n", cpu);
    return 0;
}
