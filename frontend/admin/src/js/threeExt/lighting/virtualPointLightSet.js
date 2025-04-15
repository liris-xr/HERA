import * as THREE from "three";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import {classes} from "@/js/utils/extender.js"
import { randFloat } from "three/src/math/MathUtils";

export class VirtualPointLightSet extends classes(THREE.Group,SceneElementInterface) {

    primaryLights
    virtualLights

    scene

    raycaster

    constructor(primaryLights,scene) {
        super();
        this.primaryLights = primaryLights;
        this.scene = scene
        this.virutalLights = []
        this.raycaster = new THREE.Raycaster()
    }

    addVirtualLights(origin,nbLight,currentEnergy,nbBounces) {
        for(let i = 0;i<nbLight;i++) {
            // Variables used to generate random direction on a sphere
            // Source : https://people.cs.kuleuven.be/~philip.dutre/GI/TotalCompendium.pdf (33)
            const r1 = randFloat(0,1);
            const r2 = randFloat(0,1);
            
            const phi = 2*Math.PI*r1;
            const theta = Math.acos(1-(2*r2)); 

            const x = origin.x + (2 * Math.cos(phi)) * Math.sqrt(r2*(1-r2)) 
            const y = origin.y + (2 * Math.sin(phi)) * Math.sqrt(r2*(1-r2)) 
            const z = origin.z + (1-(2*r2))

            const pointOnSphere = new THREE.Vector3(x,y,z)
            const direction = pointOnSphere.sub(origin).normalize()

            this.raycaster.set(origin,direction)

            // this.scene.add(new THREE.ArrowHelper(this.raycaster.ray.direction, this.raycaster.ray.origin, 300, 0xff0000) );

            let closestIntersect = {
                distance: Infinity
            };

            this.scene.assetManager.meshManagerMap.forEach( (meshManager) => {
                for (let mesh of meshManager.getMeshes.value) {
                    
                    // Closest intersection found by the ray in the mesh
                    const intersect = this.raycaster.intersectObject(mesh);
                    
                    if(intersect.length > 0) {
                        if(intersect[0].distance < closestIntersect.distance) closestIntersect = intersect[0] 
                    }
                }
            })
            // console.log(closestIntersect.object.material);
            
            if(closestIntersect.distance < Infinity) {
                const newLightEnergy = currentEnergy - closestIntersect.object.material.roughness
                
                const newLight = new THREE.PointLight(0xffffff,1)
                newLight.color = closestIntersect.object.material.color
                newLight.position.copy(closestIntersect.point)
    
                this.add(newLight)
                // console.log(nbBounces);
                
                if(nbBounces > 0) {
                    this.addVirtualLights(newLight.position,nbLight,1,nbBounces-1)
                }
            }

        }
    }

    // **Bounces** >= 1
    // The more bounces you have, the more lights layer you have
    // **nbSample** 
    // The number of lights created for one light source
    bake(bounces,nbSample) {
        
        for(let light of this.primaryLights) {
            const origin = light.position
            this.add(light)
            this.addVirtualLights(origin,nbSample,1,bounces)
        }
    }

    pushToScene(){
        this.scene.add(this);
    }
}
