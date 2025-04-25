import * as THREE from "three";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import {classes} from "@/js/utils/extender.js"
import { randFloat } from "three/src/math/MathUtils";

// Source : https://gist.github.com/brannondorsey/dc4cfe00d6b124aebd3277159dcbdb14
// draw a discrete sample (index) from a probability distribution (an array of probabilities)
// probs will be rescaled to sum to 1.0 if the values do not already
function sample(probs) {
    const sum = probs.reduce((a, b) => a + b, 0)
    if (sum <= 0) throw Error('probs must sum to a value greater than zero')
    const normalized = probs.map(prob => prob / sum)
    const sample = Math.random()
    let total = 0
    for (let i = 0; i < normalized.length; i++) {
        total += normalized[i]
        if (sample < total) return i
    }
}


class Triangle {
    a;
    b;
    c;

    normal;
    area;

    constructor(a,b,c) {
        this.a = a;
        this.b = b;
        this.c = c;
    }
}

// Tableau des triangles émissifs de la scène
// + Tableau de pondération en fonctiond de la taille des triangles
class LightSources {  
    triangles;
    weights;
    lightSourceArea;

    constructor() {
        this.lightSourceArea = 0;
        this.triangles = []
        this.weights = []
    }

    initLightSources(scene) {
        scene.assetManager.meshManagerMap.forEach( (meshManager) => {
            
            for (let mesh of meshManager.getMeshes.value) {
                if(mesh.material.emissiveIntensity && (
                    mesh.material.emissive.r != 0 ||
                    mesh.material.emissive.g != 0 ||
                    mesh.material.emissive.b != 0 
                )
            ) { 
                    const indexes = mesh.geometry.getIndex().array;
                    const positionBufferAttribute = mesh.geometry.getAttribute("position").clone();
                    positionBufferAttribute.applyMatrix4(mesh.matrix)
                    const positionBuffer = positionBufferAttribute.array

                    for(let i = 0;i<mesh.geometry.getIndex().count;i+=3) {
                        const aId = indexes[i];
                        const bId = indexes[i+1];
                        const cId = indexes[i+2];

                        const t = new Triangle(
                            new THREE.Vector3(positionBuffer[(aId*3)],positionBuffer[(aId*3)+1],positionBuffer[(aId*3)+2]),
                            new THREE.Vector3(positionBuffer[(bId*3)],positionBuffer[(bId*3)+1],positionBuffer[(bId*3)+2]),
                            new THREE.Vector3(positionBuffer[(cId*3)],positionBuffer[(cId*3)+1],positionBuffer[(cId*3)+2])
                        );
                        
                        const ab = new THREE.Vector3().subVectors(t.b,t.a);
                        const ac = new THREE.Vector3().subVectors(t.c,t.a);

                        const normal = new THREE.Vector3().crossVectors(ab,ac);

                        t.area = normal.length();
                        t.normal = normal.normalize()
                        this.lightSourceArea += t.area;
                        
                        this.triangles.push(t);
                    }
                }
            }
        })

        for(let triangle of this.triangles) {
            this.weights.push(triangle.area/this.lightSourceArea);
        }
    }

    

    // Return a triangle based on its area
    // The bigger it is, the more likely it is to be picked
    getRandomWeightedTriangle() {
        return this.triangles[sample(this.weights)];
    }

};


export class LightProbeVolume extends classes(THREE.Group,SceneElementInterface) {

    rawData; // 1D table of probes
    raycaster;

    shTextures;

    scene;

    ls;

    // Mostly, place probes
    constructor(center,density,width,depth,height,scene) {
        super();

        this.scene = scene;

        this.scene.shTexturesWidth = width*density;
        this.scene.shTexturesDepth = depth*density;
        this.scene.shTexturesHeight = height*density;
        this.scene.lpvWidth = width;
        this.scene.lpvDepth = depth;
        this.scene.lpvHeight = height;
        this.scene.shTexturesCenter = center;

        this.raycaster = new THREE.Raycaster()
        this.rawData = [];
        this.shTextures = [];

        this.ls = new LightSources();
        this.ls.initLightSources(this.scene);

        for(let i = 0;i<9;i++) {
            this.shTextures.push(new Float32Array(width*depth*height*4*density*density*density));                 
        }
		
        const freq = 1/density;
        for(let y = -height/2;y<height/2;y = y + freq) {
            for(let z = -depth/2;z<depth/2;z = z + freq) {
                for(let x = -width/2;x<width/2;x = x + freq) {

                    const pos = new THREE.Vector3(x,y,z).add(center);

                    const newProbe = new THREE.LightProbe()
                    newProbe.position.copy(pos);
                    this.rawData.push(newProbe)

                    // const geometry = new THREE.SphereGeometry(0.01,30,30) 
                    // const material = new THREE.MeshBasicMaterial( { color: new THREE.Color(1,0,1) } ); 
                    // const sphere = new THREE.Mesh( geometry, material ); 
                    // sphere.position.copy(pos)
                    // scene.add( sphere );
                }
            }
        }
        for(let i = 0;i<10;i++) {
            this.getRandomDirectionTowardLightSource(new THREE.Vector3())
        }
    }

    getRandomSphereDirection(origin) {
        const r1 = randFloat(0,1);
        const r2 = randFloat(0,1);
        
        const phi = 2*Math.PI*r1;
        const theta = Math.acos(1-(2*r2)); 

        const x = origin.x + (2 * Math.cos(phi)) * Math.sqrt(r2*(1-r2)) 
        const y = origin.y + (2 * Math.sin(phi)) * Math.sqrt(r2*(1-r2)) 
        const z = origin.z + (1-(2*r2))

        const pointOnSphere = new THREE.Vector3(x,y,z)
        const direction = pointOnSphere.sub(origin).normalize()

        return direction;
    }

    getRandomDirectionTowardLightSource(origin) {
        const t = this.ls.getRandomWeightedTriangle();

        const r1 = randFloat(0,0.5);
        const r2 = randFloat(0,0.5);

        const ab = new THREE.Vector3().subVectors(t.b,t.a);
        const ac = new THREE.Vector3().subVectors(t.c,t.a);
        const randomVector = new THREE.Vector3().addVectors(
            ab.multiplyScalar(r1),
            ac.multiplyScalar(r2)
        );
        const point = new THREE.Vector3().copy(t.a)
        .add(randomVector)
        .addScaledVector(t.normal,0.001);


        return point.sub(origin).normalize();
    }

    getClosestIntersection() {
        let closestIntersect = {
            distance: Infinity
        };

        this.scene.assetManager.meshManagerMap.forEach( (meshManager) => {
            for (let mesh of meshManager.getMeshes.value) {
                
                // Closest intersection found by the ray in the mesh
                const intersect = this.raycaster.intersectObject(mesh);
                
                if(intersect.length > 0) {
                    if(intersect[0].distance < closestIntersect.distance) {
                        closestIntersect = intersect[0] 
                        
                    } 
                }
            }
        })

        return closestIntersect;
    }

    updateDirectLighting(origin, coefficients,weight) {
        // const dir = this.getRandomSphereDirection(probe.position);
        const dir = this.getRandomDirectionTowardLightSource(origin);

        this.raycaster.set(origin,dir);
        // this.scene.add(new THREE.ArrowHelper(this.raycaster.ray.direction, this.raycaster.ray.origin, 300, 0xff0000) );
        
        const closestIntersect = this.getClosestIntersection();

        if(closestIntersect.distance < Infinity) {
            if(closestIntersect.object.material.emissiveIntensity && (
                    closestIntersect.object.material.emissive.r != 0 ||
                    closestIntersect.object.material.emissive.g != 0 ||
                    closestIntersect.object.material.emissive.b != 0 
                )
            ) {
                const shBasis = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];

                // evaluate SH basis functions in direction dir
                THREE.SphericalHarmonics3.getBasisAt( dir, shBasis );
                const color = closestIntersect.object.material.emissive;
                for ( let j = 0; j < 9; j ++ ) {
                    
                    coefficients[ j ].x += shBasis[ j ] * color.r * weight;
                    coefficients[ j ].y += shBasis[ j ] * color.g * weight;
                    coefficients[ j ].z += shBasis[ j ] * color.b * weight;
                    
                }
            }
        }
    }

    updateIndirectLighting(origin,coefficients,nbDirectSamples,nbIndirectSamples,directWeight,indirectWeight) {
        const pdf = 1/(4*Math.PI)
        // We shoot nbSamble ray in random directions
        for(let i = 0;i<nbIndirectSamples;i++) {
            const dir = this.getRandomSphereDirection(origin);
    
            this.raycaster.set(origin,dir);
            
            const closestIntersect = this.getClosestIntersection();
    
            if(closestIntersect.distance < Infinity) {
                const shBasis = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
                THREE.SphericalHarmonics3.getBasisAt( dir, shBasis );
                if(closestIntersect.object.material.roughness > 0) { // Light reflector touched
                    var lightReflectorColor = new THREE.Vector3()
                    const color = closestIntersect.object.material.color;
                    const touchedObjectNormal = closestIntersect.normal.clone();
                    touchedObjectNormal.set(touchedObjectNormal.x,touchedObjectNormal.z,-touchedObjectNormal.y);
                    const lightReflectorOrigin = closestIntersect.point.clone().add(touchedObjectNormal.multiplyScalar(0.01))
                    for(let n = 0;n<32;n++) {
                        const dirLightSource = this.getRandomDirectionTowardLightSource(lightReflectorOrigin);
                        this.raycaster.set(lightReflectorOrigin,dirLightSource); 

                        const ci = this.getClosestIntersection();

                        if(ci.distance < Infinity) {
                            if(ci.object.material.emissiveIntensity && (
                                    ci.object.material.emissive.r != 0 ||
                                    ci.object.material.emissive.g != 0 ||
                                    ci.object.material.emissive.b != 0 
                                )
                            ) {
                                
                                lightReflectorColor.x += color.r * 0.03125; 
                                lightReflectorColor.y += color.g * 0.03125; 
                                lightReflectorColor.z += color.b * 0.03125; 
                                // lightReflectorColor.x += color.r * 0.0625; 
                                // lightReflectorColor.y += color.g * 0.0625; 
                                // lightReflectorColor.z += color.b * 0.0625; 
                            }
                        }
                    }
                    
                    // We update our light probes coefficients depending on color, roughness and received light from the light source
                    for ( let j = 0; j < 9; j ++ ) {
                        coefficients[ j ].x += (shBasis[j] * lightReflectorColor.x * closestIntersect.object.material.roughness) * indirectWeight * 20;
                        coefficients[ j ].y += (shBasis[j] * lightReflectorColor.y * closestIntersect.object.material.roughness) * indirectWeight * 20;
                        coefficients[ j ].z += (shBasis[j] * lightReflectorColor.z * closestIntersect.object.material.roughness) * indirectWeight * 20;
                    }

                }
            }
        }
    }

    // Bounces : number of light bounces
    // nbSample : number of ray for each bounces

    // Fill the 9 "textures" of shTextures, each texture containing 1 float of the 9 coefficients of a spherical harmonics
    bake(bounces,directSamples,indirectSamples) {
        console.log(this.rawData.length);
        

        const directWeight = 1 / directSamples;
        const indirectWeight = 1 / indirectSamples;
        
        for(let probeId = 0;probeId<this.rawData.length;probeId++) {
            let probe = this.rawData[probeId];
            
            const sh = new THREE.SphericalHarmonics3();
            const shCoefficients = sh.coefficients;

            const shIndirect = new THREE.SphericalHarmonics3();
            const shCoefficientsIndirect = shIndirect.coefficients;
    
            if(probeId % 100 === 0) {
                console.log(probeId);
            }
            
            for(let i = 0;i<directSamples;i++) {
                this.updateDirectLighting(probe.position,shCoefficients,directWeight);
            }
            for(let j = 0;j<bounces;j++) {
                this.updateIndirectLighting(probe.position,shCoefficientsIndirect,directSamples,indirectSamples,directWeight,indirectWeight)
            }

            probe.sh = sh.lerp(shIndirect,0.4);

            for(let coef = 0;coef<9;coef++) {
                for(let color = 0;color<4;color++) {
                    const value = color === 0 ? probe.sh.coefficients[coef].x : color === 1 ? probe.sh.coefficients[coef].y : color === 2 ? probe.sh.coefficients[coef].z : 0;
                    this.shTextures[coef][(probeId*4)+color] = value;
                }
            }
        }
        this.scene.shTextures = this.shTextures;
    }
}
