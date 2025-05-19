#include "lightSources.hpp"
#include <random>

std::random_device seed;
std::default_random_engine LSrng(seed());

LightSources::LightSources(const Mesh & mesh,const std::vector<GLTFMaterial> & materials) {
    this->area = 0;

    for(int i= 0; i < mesh.triangle_count(); i++) {
        Color color = materials[mesh.triangle_material_index(i)].emission;
        if(color.max() > 0) {
            TriangleData t = mesh.triangle(i);
            this->triangleIds.push_back(i);

            float a = length(cross(Vector(t.b)-Vector(t.a),Vector(t.c)-Vector(t.a)))/float(2);

            this->area += a;
            this->weights.push_back(a);
            this->triangleColor.push_back(color);
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
    return this->dd(LSrng);
}

unsigned int LightSources::getTriangleId(unsigned int lightSourceId) {
    return this->triangleIds[lightSourceId];
}

Color LightSources::getTriangleColor(unsigned int lightSourceId) {
    return this->triangleColor[lightSourceId];
}