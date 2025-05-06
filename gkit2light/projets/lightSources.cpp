#include "lightSources.hpp"
#include <random>


LightSources::LightSources(Mesh mesh) {
    this->area = 0;

    for(int i= 0; i < mesh.triangle_count(); i++) {
        if(mesh.triangle_material(i).emission.max() > 0) {
            TriangleData t = mesh.triangle(i);
            this->triangleIds.push_back(i);

            float a = length(cross(Vector(t.b)-Vector(t.a),Vector(t.c)-Vector(t.a)))/float(2);

            this->area += a;
            this->weights.push_back(a);
            this->triangles.push_back(t);
        }
    }

    for(int i = 0;i<this->weights.size();i++) {
        this->weights[i] /= this->area;
    }
}

LightSources::~LightSources() {

}

unsigned int LightSources::getRandomWeightedTriangleId() {
    std::random_device hwseed;
    std::default_random_engine rng(hwseed());

    std::discrete_distribution<unsigned int> dd(this->weights.begin(),this->weights.end());

    return dd(rng);
}

Point LightSources::getRandomPoint() {
    std::random_device hwseed;
    std::default_random_engine rng(hwseed());

    std::uniform_real_distribution<float> uniform(0, 1);

    float r1 = uniform(rng)/2;
    float r2 = uniform(rng)/2;

    TriangleData t = this->triangles[this->getRandomWeightedTriangleId()];
    
    return Point (Vector(t.a) 
            + ( (Vector(t.b) - Vector(t.a)) * r1 )
            + ( (Vector(t.c) - Vector(t.a)) * r2 )) + Vector(t.na) *0.001;
}