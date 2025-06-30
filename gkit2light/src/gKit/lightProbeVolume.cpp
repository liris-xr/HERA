#include "lightProbeVolume.hpp"
#include "gltf.h"
#include "image.h"
#include "image_io.h"
#include "lightProbe.hpp"
#include "lightSources.hpp"
#include "octahedron.hpp"
#include "vec.h"
#include "mesh.h"
#include <cmath>
#include <random>
#include <math.h>
#include <fstream>
#include <string>
#include <vector>
#include <omp.h>

std::random_device hwseed;
std::default_random_engine rng(hwseed());
std::uniform_real_distribution<float> uniform(0, 1);


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
                                   const unsigned int nbDirectIndirectSamples,
                                   const unsigned int depthMapSize,
                                   const unsigned int nbRayPerAis) {
    this->mesh = mesh;
    this->materials = materials;
    this->lightSources = new LightSources(mesh,materials);

    this->octahedron = new Octahedron(depthMapSize);

    this->texturesWidth = width*density; 
    this->texturesDepth = depth*density; 
    this->texturesHeight = height*density; 

    this->nbDirectSamples = nbDirectSamples;
    this->nbIndirectSamples = nbIndirectSamples;
    this->nbDirectIndirectSamples = nbDirectIndirectSamples;

    this->depthMapSize = depthMapSize;
    this->nbRayPerAis = nbRayPerAis;

    this->depthMapSizeWithBorders = depthMapSize+2;
    

    this->indirectWeight = (1.0/float(nbIndirectSamples));

    
    int n= mesh.triangle_count();
    for(int i= 0; i < n; i++) {
        TriangleData td = mesh.triangle(i);
        
        this->meshTriangles.emplace_back(td,i);
    }
    
    float freq = 1.0/density;
    unsigned int nbProbe = 0;
    
    for(unsigned int i = 0;i<texturesHeight;i++) {
        for(unsigned int j = 0; j<texturesDepth; j++) {
            for(unsigned int k = 0;k<texturesWidth;k++) {
                Point pos(
                    ( (float(k)/texturesWidth) * width ) - width/2.0,
                    ( (float(i)/texturesHeight) * height ) - height/2.0,
                    ( (float(j)/texturesDepth) * depth ) - depth/2.0
                );
                
                pos = pos + center;
                
                probes.push_back(LightProbe(pos,nbProbe));
                nbProbe++;
                
            }
        }
    }
    
    std::cout<<nbProbe<<std::endl;
    this->depthMapNbPixel = (depthMapSizeWithBorders)*(depthMapSizeWithBorders);
    this->depthMapAtlasWidth = this->texturesWidth * (depthMapSizeWithBorders);
    this->depthMapAtlasDepth = this->texturesDepth * (depthMapSizeWithBorders);
    this->depthMapAtlasHeight = this->texturesHeight;
    this->writeParameters(density,width,depth,height,center);


    for(int i = 0;i<9;i++) {
        this->shTextures[i].resize(nbProbe*4);
    }

    this->invalidityTexture = std::vector<float>(nbProbe,0);
    this->depthMapAtlas = std::vector<vec2>(nbProbe*depthMapNbPixel,vec2());
}

LightProbeVolume::~LightProbeVolume() {

}


Vector LightProbeVolume::getRandomSphereDirection(const Point & origin) {
    float r1 = uniform(rng);
    float r2 = uniform(rng);
    
    float phi = 2*M_PI*r1;
    float theta = acos(1-(2*r2)); 

    float x = origin.x + (2 * cos(phi)) * sqrt(r2*(1-r2));
    float y = origin.y + (2 * sin(phi)) * sqrt(r2*(1-r2)); 
    float z = origin.z + (1-(2*r2));

    
    Point pointOnSphere(x,y,z);
    Vector direction = pointOnSphere - origin;

    return normalize(direction);
}

float fract( const float v )  { return v - std::floor(v); }

Vector LightProbeVolume::getRandomSphereDirectionFibo(const int i, const int N, const float offset) {
    const float ratio= (std::sqrt(5) + 1) / 2.0;
    
    const float movedI = i + offset; 

    float phi= float(2 * M_PI) * fract(movedI / ratio);
    float cos_theta= 1 - float(2*movedI +1) / float(N);
    float sin_theta= std::sqrt(1 - cos_theta*cos_theta);
    
    return normalize(Vector(std::cos(phi) * sin_theta, std::sin(phi) * sin_theta, cos_theta));
}

void LightProbeVolume::addNeighbour(const unsigned int probeId,std::vector<LightProbe> & neighbours) {
    if(probeId >= 0 && probeId < this->probes.size()) {
        neighbours.push_back(this->probes[probeId]);
    }
}

void LightProbeVolume::add3DNeighbours(const unsigned int probeId,std::vector<LightProbe> & neighbours) {
    this->addNeighbour(probeId-1,neighbours);
    this->addNeighbour(probeId+1,neighbours);

    this->addNeighbour((probeId-1)-this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId)-this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId+1)-this->texturesWidth*this->texturesDepth,neighbours);

    this->addNeighbour((probeId-1)+this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId)+this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId+1)+this->texturesWidth*this->texturesDepth,neighbours);

    this->addNeighbour((probeId)-this->texturesWidth,neighbours);
    this->addNeighbour((probeId-1)-this->texturesWidth,neighbours);
    this->addNeighbour((probeId+1)-this->texturesWidth,neighbours);

    this->addNeighbour((probeId)+this->texturesWidth,neighbours);
    this->addNeighbour((probeId-1)+this->texturesWidth,neighbours);
    this->addNeighbour((probeId+1)+this->texturesWidth,neighbours);

    this->addNeighbour((probeId-1)-this->texturesWidth+this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId)-this->texturesWidth+this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId+1)-this->texturesWidth+this->texturesWidth*this->texturesDepth,neighbours);

    this->addNeighbour((probeId-1)+this->texturesWidth+this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId)+this->texturesWidth+this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId+1)+this->texturesWidth+this->texturesWidth*this->texturesDepth,neighbours);

    this->addNeighbour((probeId-1)+this->texturesWidth-this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId)+this->texturesWidth-this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId+1)+this->texturesWidth-this->texturesWidth*this->texturesDepth,neighbours);

    this->addNeighbour((probeId-1)-this->texturesWidth-this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId)-this->texturesWidth-this->texturesWidth*this->texturesDepth,neighbours);
    this->addNeighbour((probeId+1)-this->texturesWidth-this->texturesWidth*this->texturesDepth,neighbours);
}

float LightProbeVolume::getClosestNeighbourDistance(const Point & position,std::vector<LightProbe> & neighbours) {
    float minDist = std::numeric_limits<float>::max();
    for(LightProbe neighbour : neighbours) {
        float dist = length(neighbour.position - position);
        if(dist < minDist) {
            minDist = dist;
        }
    }
    return minDist;
}

void LightProbeVolume::updateBasedOnInvalidity() {
    for(LightProbe & probe : this->probes) {
        // Based on the probe's invalidity score
        // We create a meaned spherical harmonics of the surrounding probes (weighted with their own score)
        // Then we lerp between both, based on the probe's invalidity score
        if(this->invalidityTexture[probe.id] > 0) {
            LightProbe newLightProbe(probe.position,probe.id);
            std::vector<LightProbe> neighbours;
            this->add3DNeighbours(probe.id,neighbours);
            float maxDist = this->getClosestNeighbourDistance(probe.position,neighbours);

            // Quantity of sh added to newSphericalHarmonics
            float shAmount = 0;
            for(LightProbe neighbour : neighbours) {
                if(length(neighbour.position - probe.position) < maxDist*2) {
                    float amount = 1 - this->invalidityTexture[neighbour.id];
                    newLightProbe.addScaled(neighbour,amount);
                    shAmount += amount;
                }
            }
            newLightProbe.scale(float(1)/shAmount);

            probe = newLightProbe;
        }
    }
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

Hit LightProbeVolume::getClosestIntersection(const Point & origin,const Vector & direction) {
    Ray ray(origin,direction);

    float intersectionDistance = std::numeric_limits<float>::max();
    
    
    Hit closestHit;
    for(int j= 0; j < int(meshTriangles.size()); j++)
    { 
        
        if(Hit hit = this->meshTriangles[j].intersect(ray, ray.tmax))
        {
            if(intersectionDistance > hit.t) { // Si on a trouvé une intersection plus proche
                closestHit = hit;
                intersectionDistance = hit.t;
            }
        }
    }
    return closestHit;
}

bool LightProbeVolume::isBackFaceTouched(const unsigned int triangleId, const Vector & direction) {
    const Triangle t = this->meshTriangles[triangleId];
    return dot(t.n,-direction) < 0.0;
}

void LightProbeVolume::updateDirectLighting(LightProbe & probe) {
    // #pragma omp parallel for
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
            float lightStrength = this->lightSources->getTriangleStrength(lightSourceId);
            
            for (unsigned int j = 0;j<9;j++) {
                probe.directCoefficients[j].x += color.r * shBasis[j];
                probe.directCoefficients[j].y += color.g * shBasis[j];
                probe.directCoefficients[j].z += color.b * shBasis[j];
            }
        }
    }
}

void LightProbeVolume::updateIndirectLighting(LightProbe & probe) {
    unsigned int nbIntersection = 0;
    float distanceFromGeometry = std::numeric_limits<float>::max();
    Vector directionOfGeometry;

    float sampleOffset = uniform(rng);
    for(unsigned int i = 0;i<this->nbIndirectSamples;i++) {
        Vector sphereDirection = this->getRandomSphereDirectionFibo(i,this->nbIndirectSamples,sampleOffset);
        // Vector sphereDirection = this->getRandomSphereDirection(probe.position);

        Hit hit = this->getClosestIntersection(probe.position, sphereDirection);

        if(hit) {
            nbIntersection++;
            float * shBasis = getBasis(sphereDirection);

            if(hit.t < distanceFromGeometry) {
                distanceFromGeometry = hit.t;
                directionOfGeometry = sphereDirection;
            }

            if(isBackFaceTouched(hit.triangle_id, sphereDirection)) {
                this->invalidityTexture[probe.id]++;

            } else {
                const GLTFMaterial material = this->materials[mesh.triangle_material_index(hit.triangle_id)];
                float roughness = material.roughness;
                if(roughness > 0.0) { // Light reflector touched
                    Color lightReflectorColor = Color(0);
                    Vector lightReflectorNormal = this->meshTriangles[hit.triangle_id].n;

                    Point lightReflectorOrigin = (probe.position + sphereDirection*hit.t) + (lightReflectorNormal * 0.01);

                    for(unsigned int j = 0;j<this->nbDirectIndirectSamples;j++) {
                        unsigned int lightSourceId = this->lightSources->getRandomWeightedLightSourceId();
                        unsigned int triangleId = this->lightSources->getTriangleId(lightSourceId);
                        Triangle t = this->meshTriangles[triangleId];
                        Point pointOnLightSource = t.getRandomPointOnTriangle();
                        
                        float intersectionDistance = length(pointOnLightSource-lightReflectorOrigin);
                        Vector dir = normalize(pointOnLightSource-lightReflectorOrigin);

                        if(!this->isDirectionObstructed(lightReflectorOrigin, dir, intersectionDistance)) {
                            Color lightSourceColor = this->lightSources->getTriangleColor(lightSourceId);
                            lightReflectorColor = lightReflectorColor + (material.color*lightSourceColor);
                        }
                    }
                    lightReflectorColor = (lightReflectorColor * this->lightSources->totalLuminance) / float(this->nbDirectIndirectSamples);
                    if(lightReflectorColor.max() > 0.0) {
                        float * shBasis = getBasis(sphereDirection);
                        for (unsigned int j = 0;j<9;j++) {
                            float contribution = shBasis[j] * roughness;
                            probe.indirectCoefficients[j].x += lightReflectorColor.r*contribution;
                            probe.indirectCoefficients[j].y += lightReflectorColor.g*contribution;
                            probe.indirectCoefficients[j].z += lightReflectorColor.b*contribution;
                        }
                    }
                }
            }
        }
    }
    
    if(this->invalidityTexture[probe.id]) {
        this->invalidityTexture[probe.id] /= float(nbIntersection);
        if(this->invalidityTexture[probe.id] > 0.1 && probe.nbDisplacement < 3) {
            probe.position = probe.position + directionOfGeometry*distanceFromGeometry*1.01;
            probe.nbDisplacement++;
            
            for (unsigned int j = 0;j<9;j++) {
                probe.indirectCoefficients[j].x = 0;
                probe.indirectCoefficients[j].y = 0;
                probe.indirectCoefficients[j].z = 0;
            }
            
            this->invalidityTexture[probe.id] = 0;
            this->updateIndirectLighting(probe);
        }
    }
}

void LightProbeVolume::stitchDepthMapCorners(unsigned int i0) {
    // Down left pixel (taking up right pixel)
    this->depthMapAtlas[ i0 - 1 - depthMapAtlasWidth ] = this->depthMapAtlas[
        i0+depthMapSize-1+
        (depthMapAtlasWidth*(depthMapSize-1))
    ];
    // Down right pixel
    this->depthMapAtlas[ i0 - depthMapAtlasWidth + depthMapSize] = this->depthMapAtlas[
        i0+
        (depthMapAtlasWidth*(depthMapSize-1))
    ];

    // Up left pixel
    this->depthMapAtlas[
        i0-1+
        (depthMapAtlasWidth*depthMapSize)
    ] = this->depthMapAtlas[i0+depthMapSize-1];

    // Up right pixel 
    this->depthMapAtlas[
        i0+depthMapSize+
        depthMapAtlasWidth*depthMapSize
    ] = this->depthMapAtlas[i0];
}


void LightProbeVolume::stitchDepthMapSide(unsigned int start, unsigned int end,const char side) {
    int offset;
    int incr;

    switch(side) {
        case 'd': //down
            offset = -depthMapAtlasWidth;
            incr = 1;
            break;
        case 'u': //up
            offset = depthMapAtlasWidth;
            incr = 1;
            break;
        case 'l': //left
            offset = -1;
            incr = depthMapAtlasWidth;
            break;
        case 'r': //right
            offset = 1;
            incr = depthMapAtlasWidth;
            break;
    }

    unsigned int backwardOffset = 0;
    for(unsigned int i = start;i<end;i+=incr) {
        unsigned int iSize = end-incr-backwardOffset + offset; 
        backwardOffset += incr;
        this->depthMapAtlas[iSize] = this->depthMapAtlas[i];
    }
}

// ^ 
// | j
// |
// |    i
// |----->

void LightProbeVolume::updateDepthMap(LightProbe & probe) {
    unsigned int nbProbeOnLayer = unsigned(texturesWidth)*unsigned(texturesDepth);

    unsigned int probeLayerId = probe.id % nbProbeOnLayer;

    unsigned int startDepth = ( probeLayerId / unsigned(texturesWidth) ) * (depthMapNbPixel * unsigned(texturesWidth));
    unsigned int startWidth = ( probeLayerId % unsigned(texturesWidth) ) * depthMapSizeWithBorders;
    unsigned int startHeight = ( probe.id / nbProbeOnLayer ) * ( depthMapNbPixel * nbProbeOnLayer );

    for(unsigned int j = 0;j<depthMapSize;j++) {
        std::vector<float> line;

        for(unsigned int i = 0;i<depthMapSize;i++) {

            float mean = 0;

            std::vector<float> hits;

            for(float y = float(j);y<float(j)+1;y += float(1)/this->nbRayPerAis) {
                for(float x = float(i);x<float(i)+1;x += float(1)/this->nbRayPerAis) {
                    Vector sphereDirection = octahedron->getVector(x,y);
        
        
                    Hit hit = this->getClosestIntersection(probe.position, sphereDirection);
                    
                    hits.push_back(hit.t);
                    mean += hit.t;
                }
            }
            unsigned int index =  startDepth
                                + startWidth
                                + startHeight
                                + (j+1) * depthMapAtlasWidth
                                + (i+1);

            mean /= this->nbRayPerAis*this->nbRayPerAis;
            
            line.push_back(mean);
            this->depthMapAtlas[index].x = mean;

            float variance = 0;
            for(float hit : hits) {
                float diff = hit - mean;
                variance += diff*diff;
            }
            variance /= (this->nbRayPerAis*this->nbRayPerAis) - 1;
            variance = sqrt(variance);

            this->depthMapAtlas[index].y = variance;
        }

        probe.octMap.push_back(line);
    }

    unsigned int i0 = startDepth
                    + startWidth
                    + startHeight
                    + depthMapAtlasWidth
                    + 1; //Down left pixel of the texture
    
    // Down stiching 
    unsigned int start = i0;
    unsigned int end = i0+depthMapSize;
    stitchDepthMapSide(start,end,'d');
    
    // Up stiching
    start = i0 + depthMapAtlasWidth*(depthMapSize-1);
    end = start + depthMapSize;
    stitchDepthMapSide(start,end,'u');

    // // Left stiching
    start = i0;
    end = i0 + ( depthMapAtlasWidth * depthMapSize );
    stitchDepthMapSide(start,end,'l');

    // // Right stiching
    start = i0 + depthMapSize - 1;
    end = start + ( depthMapAtlasWidth * depthMapSize ) ;
    stitchDepthMapSide(start,end,'r');

    stitchDepthMapCorners(i0);
}

void LightProbeVolume::bake() {
    #pragma omp parallel for
    for(LightProbe & probe : this->probes) {
        updateIndirectLighting(probe);
        updateDirectLighting(probe);

        updateDepthMap(probe);

        for (unsigned int j = 0;j<9;j++) {
            probe.directCoefficients[j].x = (probe.directCoefficients[j].x * this->lightSources->totalLuminance) / float(this->nbDirectSamples);
            probe.directCoefficients[j].y = (probe.directCoefficients[j].y * this->lightSources->totalLuminance) / float(this->nbDirectSamples);
            probe.directCoefficients[j].z = (probe.directCoefficients[j].z * this->lightSources->totalLuminance) / float(this->nbDirectSamples);

            probe.indirectCoefficients[j].x = (probe.indirectCoefficients[j].x * 4*M_PI) / float(this->nbIndirectSamples);
            probe.indirectCoefficients[j].y = (probe.indirectCoefficients[j].y * 4*M_PI) / float(this->nbIndirectSamples);
            probe.indirectCoefficients[j].z = (probe.indirectCoefficients[j].z * 4*M_PI) / float(this->nbIndirectSamples);

            probe.coefficients[j].x = probe.directCoefficients[j].x + probe.indirectCoefficients[j].x;
            probe.coefficients[j].y = probe.directCoefficients[j].y + probe.indirectCoefficients[j].y;
            probe.coefficients[j].z = probe.directCoefficients[j].z + probe.indirectCoefficients[j].z;
        }
        if(probe.id % 1000 == 0) {
            std::cout<<probe.id<<std::endl;
        }
    }

    this->updateBasedOnInvalidity();

    for(LightProbe & probe : this->probes) {
        for(unsigned int coef = 0;coef<9;coef++) {
            for(unsigned int color = 0;color<4;color++) {
                float value = color == 0 ? probe.coefficients[coef].x : color == 1 ? probe.coefficients[coef].y : color == 2 ? probe.coefficients[coef].z : 0;
                this->shTextures[coef][(probe.id*4)+color] = value;
            }
        }
    }
}

void LightProbeVolume::writeLPV() {
    
    // Write light spherical harmonics textures
    #pragma omp parallel for
    for(int coef=0;coef<9;coef++) {
        std::fstream shFile;
        shFile.open("../frontend/admin/public/textures/sh"+std::to_string(coef)+".csv",std::ios_base::out);
        
        for(unsigned int i=0;i<this->shTextures[coef].size()-1;i++) {
            shFile<<shTextures[coef][i]<<',';
        }
        shFile<<shTextures[coef][this->shTextures[coef].size()-1];

        shFile.close();
    } 

    // Write probe's depth map
    #pragma omp parallel for
    for(int coef=0;coef<9;coef++) {
        std::fstream atlasFile;
        atlasFile.open("../frontend/admin/public/textures/depthMapAtlas.csv",std::ios_base::out);
        
        for(unsigned int i=0;i<this->depthMapAtlas.size()-1;i++) {
            atlasFile<<depthMapAtlas[i].x<<',';
            // Rajouter la variance ici
        }
        atlasFile<<depthMapAtlas[this->depthMapAtlas.size()-1].x;
        // Rajouter la variance ici


        atlasFile.close();
    } 
}

void LightProbeVolume::writeParameters(float density,float width,float depth,float height,const Point & center) {
     // Write light probe volume parameters in a json file
     std::fstream file;
     std::string json = "{\n\"density\":"+std::to_string(density)+",\n\"width\":"+std::to_string(width)+",\n\"depth\":"+std::to_string(depth)+",\n\"height\":"+std::to_string(height)+",\n\"center\":{\"x\":"+std::to_string(center.x)+",\"y\":"+std::to_string(center.y)+",\"z\":"+std::to_string(center.z)+"}\n}";
     file.open("../frontend/admin/public/textures/lpvParameters.json",std::ios_base::out);
     file<<json;
     file.close();

     json = "{\n\"width\":"+std::to_string(this->depthMapAtlasWidth)+",\n\"depth\":"+std::to_string(this->depthMapAtlasDepth)+",\n\"depthMapSize\":"+std::to_string(this->depthMapSize)+"\n}";
     file.open("../frontend/admin/public/textures/atlasParameters.json",std::ios_base::out);
     file<<json;
     file.close();
}

void LightProbeVolume::writeDepthMap() {
    unsigned int size = this->depthMapSizeWithBorders;
    Image depthMap(size,size);

    for(unsigned i = 0;i<this->depthMapNbPixel;i++) {
        float value = this->depthMapAtlas[i].x;
        depthMap(i) = Color(value);
    }
    write_image(depthMap, "../frontend/admin/public/textures/depthMapS.png");

}

void LightProbeVolume::writeDepthMapLayer(unsigned int stage) {
    unsigned int sizeX = this->depthMapSizeWithBorders*this->texturesWidth;
    unsigned int sizeZ = this->depthMapSizeWithBorders*this->texturesDepth;
    Image atlas(sizeX,sizeZ);

    unsigned int start = (stage % unsigned(texturesHeight)) 
                            * texturesWidth * texturesDepth * depthMapNbPixel;

    unsigned int end = ((stage+1) % unsigned(texturesHeight)) 
                            * texturesWidth * texturesDepth * depthMapNbPixel;

    int imageIndex = 0;
    for(unsigned int i = start;i<end;i++) {
        atlas(imageIndex) = Color(this->depthMapAtlas[i].x);
        imageIndex++;
    }

    write_image(atlas, "../frontend/admin/public/textures/atlas.png");
}

