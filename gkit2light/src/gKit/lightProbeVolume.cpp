#include "lightProbeVolume.hpp"
#include "gltf.h"
#include "lightProbe.hpp"
#include "lightSources.hpp"
#include "vec.h"
#include "mesh.h"
#include <random>
#include <math.h>
#include <fstream>
#include <iterator>
#include <vector>


// renvoie la normale au point d'intersection
Vector normal( const Mesh& mesh, const Hit& hit )
{
    // recuperer le triangle du mesh
    const TriangleData& data= mesh.triangle(hit.triangle_id);
    
    // interpoler la normale avec les coordonn�es barycentriques du point d'intersection
    float w= 1 - hit.u - hit.v;
    Vector n= w * Vector(data.na) + hit.u * Vector(data.nb) + hit.v * Vector(data.nc);
    return normalize(n);
}

LightProbeVolume::LightProbeVolume(const Mesh & mesh,
                                   const std::vector<GLTFMaterial> & materials, 
                                   const Point & center,
                                   const float density,
                                   const float width,
                                   const float depth,
                                   const float height,
                                   const unsigned int nbDirectSamples,
                                   const unsigned int nbIndirectSamples,
                                   const unsigned int nbDirectIndirectSamples) {
    this->mesh = mesh;
    this->lightSources = new LightSources(mesh,materials);

    this->nbDirectSamples = nbDirectSamples;
    this->nbIndirectSamples = nbIndirectSamples;
    this->nbDirectIndirectSamples = nbDirectIndirectSamples;

    this->directWeight = 1.0/float(nbDirectSamples);
    this->indirectWeight = 1.0/float(nbIndirectSamples);
    this->directIndrectWeight = 1.0/float(nbDirectIndirectSamples);

    for(int i = 0;i<9;i++) {
        this->shTextures[i].resize(width*depth*height*density*density*density*4);
        std::cout<<shTextures[i].size()<<std::endl;

        this->invalidityTexture.reserve(width*depth*height*density*density*density);
    }
    
    int n= mesh.triangle_count();
    std::cout<<"nb triangles : "<<n<<std::endl;
    for(int i= 0; i < n; i++) {
        TriangleData td = mesh.triangle(i);

        this->meshTriangles.emplace_back(td,i);
    }

    float freq = 1.0/density;
    unsigned int nbProbe = 0;
    for(float y = -height/2;y<height/2;y = y + freq) {
        for(float z = -depth/2;z<depth/2;z = z + freq) {
            for(float x = -width/2;x<width/2;x = x + freq) {
                Point pos(x,y,z);
                pos = pos + center;
                
                probes.push_back(LightProbe(pos,nbProbe));
                nbProbe++;
            }
        }
    }
}

LightProbeVolume::~LightProbeVolume() {
    delete this->lightSources;
}


Vector LightProbeVolume::getRandomSphereDirection(const Point & origin) {
    std::random_device hwseed;
    std::default_random_engine rng(hwseed());
    std::uniform_real_distribution<float> uniform(0, 1);

    float r1 = uniform(rng)/2;
    float r2 = uniform(rng)/2;
    
    float phi = 2*M_PI*r1;
    float theta = acos(1-(2*r2)); 

    float x = origin.x + (2 * cos(phi)) * sqrt(r2*(1-r2));
    float y = origin.y + (2 * sin(phi)) * sqrt(r2*(1-r2)); 
    float z = origin.z + (1-(2*r2));

    Point pointOnSphere(x,y,z);
    Vector direction = pointOnSphere - origin;

    return normalize(direction);
}

bool LightProbeVolume::isDirectionObstructed(const Point & origin,const Vector & direction,const float intersectionDistance) {
    Ray ray(origin,direction);

    Hit hit;
    for(int j= 0; j < int(meshTriangles.size()); j++)
    { 
        hit = this->meshTriangles[j].intersect(ray, ray.tmax);
        if(hit)
        {
            if(intersectionDistance > hit.t) { // Si on a trouvé une intersection plus proche
                return true;
            }
        }
    }
    return false;
}

bool LightProbeVolume::isBackFaceTouched(const unsigned int triangleId, const Vector & direction) {
    const Triangle t = this->meshTriangles[triangleId];
    return dot(t.n,-direction) < 0.0;
}

void LightProbeVolume::updateDirectLighting(LightProbe & probe) {
    for(unsigned int i = 0;i<this->nbDirectSamples;i++) {
        unsigned int lightSourceId = this->lightSources->getRandomWeightedLightSourceId();
        unsigned int triangleId = this->lightSources->getTriangleId(lightSourceId);
        Triangle t = this->meshTriangles[triangleId];
        Point pointOnLightSource = t.getRandomPointOnTriangle();
        
        float intersectionDistance = length(pointOnLightSource-probe.position);
        Vector dir = normalize(pointOnLightSource-probe.position);

        if(!this->isDirectionObstructed(probe.position, dir, intersectionDistance)) {
            float * shBasis = getBasis(dir);
            Color color = this->lightSources->getTriangleColor(lightSourceId);
            
            for (unsigned int j = 0;j<9;j++) {
                probe.coefficients[j].x += shBasis[j] * color.r * this->directWeight;
                probe.coefficients[j].y += shBasis[j] * color.g * this->directWeight;
                probe.coefficients[j].z += shBasis[j] * color.b * this->directWeight;
            }
        }
    }
}

void LightProbeVolume::bake() {
    // #pragma omp parallel for
    for(LightProbe & probe : this->probes) {
        updateDirectLighting(probe);

        for(unsigned int coef = 0;coef<9;coef++) {
            for(unsigned int color = 0;color<4;color++) {
                float value = color == 0 ? probe.coefficients[coef].x : color == 1 ? probe.coefficients[coef].y : color == 2 ? probe.coefficients[coef].z : 0;
                this->shTextures[coef][(probe.id*4)+color] = value;
            }
        }
    }
}

void LightProbeVolume::toFile() {
    
    for(int coef=0;coef<9;coef++) {
        std::fstream file;
        file.open("../frontend/admin/public/textures/sh"+std::to_string(coef)+".csv",std::ios_base::out);
        for(int i=0;i<shTextures[coef].size();i++) {
            file<<shTextures[coef][i]<<',';
        }
        file.close();
    } 
 

}