#include "lightSources.hpp"
#include <random>


LightSources::LightSources(const Mesh & mesh) {
    this->area = 0;

    for(int i= 0; i < mesh.triangle_count(); i++) {
        if(mesh.triangle_material(i).emission.max() > 0) {
            TriangleData t = mesh.triangle(i);
            this->triangleIds.push_back(i);

            float a = length(cross(Vector(t.b)-Vector(t.a),Vector(t.c)-Vector(t.a)))/float(2);

            this->area += a;
            this->weights.push_back(a);
            this->triangleColor.push_back(mesh.triangle_material(i).emission);
        }
    }

    for(unsigned int i = 0;i<this->weights.size();i++) {
        this->weights[i] /= this->area;
    }

    this->dd = std::discrete_distribution<unsigned int>(this->weights.begin(),this->weights.end());
}

LightSources::~LightSources() {

}

unsigned int LightSources::getRandomWeightedLightSourceId() {
    std::random_device hwseed;
    std::default_random_engine rng(hwseed());

    return this->dd(rng);
}

Color LightSources::getTriangleColor(unsigned int lightSourceId) {
    return this->triangleColor[lightSourceId];
}