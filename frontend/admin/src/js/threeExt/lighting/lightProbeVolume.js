import * as THREE from "three";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import {classes} from "@/js/utils/extender.js"
import { randFloat } from "three/src/math/MathUtils";

export class LightProbeVolume extends classes(THREE.Group,SceneElementInterface) {

    rawData; // 1D table of probes
    raycaster;

    shTextures;

    scene;

    // Mostly, place probes
    constructor(center,density,width,depth,height,scene) {
        super();

        this.scene = scene;

        this.scene.shTexturesWidth = width*density;
        this.scene.shTexturesDepth = depth*density;
        this.scene.shTexturesHeight = height*density;
        this.scene.shTexturesCenter = center;

        this.raycaster = new THREE.Raycaster()
        this.rawData = [];
        this.shTextures = [];

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

                    const geometry = new THREE.SphereGeometry(0.01,30,30) 
                    const material = new THREE.MeshBasicMaterial( { color: new THREE.Color(1,0,1) } ); 
                    const sphere = new THREE.Mesh( geometry, material ); 
                    sphere.position.copy(pos)
                    scene.add( sphere );
                }
            }
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

    // Bounces : number of light bounces
    // nbSample : number of ray for each bounces

    // Fill the 9 "textures" of shTextures, each texture containing 1 float of the 9 coefficients of a spherical harmonics
    bake(bounces,nbSample) {

        const weight = 1 / nbSample;
        
        for(let probeId = 0;probeId<this.rawData.length;probeId++) {
            let probe = this.rawData[probeId];
            
            const sh = new THREE.SphericalHarmonics3();
            const shCoefficients = sh.coefficients;
    
            const shBasis = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
            
            for(let i = 0;i<nbSample;i++) {
                const dir = this.getRandomSphereDirection(probe.position);

                this.raycaster.set(probe.position,dir);
                // this.scene.add(new THREE.ArrowHelper(this.raycaster.ray.direction, this.raycaster.ray.origin, 300, 0xff0000) );
                
                const closestIntersect = this.getClosestIntersection();

                if(closestIntersect.distance < Infinity) {
                    if(closestIntersect.object.material.emissiveIntensity && (
                            closestIntersect.object.material.emissive.r != 0 ||
                            closestIntersect.object.material.emissive.g != 0 ||
                            closestIntersect.object.material.emissive.b != 0 
                        )
                    ) {
                        
                        // evaluate SH basis functions in direction dir
                        THREE.SphericalHarmonics3.getBasisAt( dir, shBasis );
                        const color = closestIntersect.object.material.emissive;
                        for ( let j = 0; j < 9; j ++ ) {
                            
                            shCoefficients[ j ].x += shBasis[ j ] * color.r * weight;
                            shCoefficients[ j ].y += shBasis[ j ] * color.g * weight;
                            shCoefficients[ j ].z += shBasis[ j ] * color.b * weight;
                            
                        }
                    }
                }
            }
            probe.sh = sh;

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
