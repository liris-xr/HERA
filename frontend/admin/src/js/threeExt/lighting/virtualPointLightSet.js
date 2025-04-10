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

    // **Bounces** >= 1
    // The more bounces you have, the more lights layer you have
    // **nbSample** 
    // The number of lights created for one light source
    bake(bounces,nbSample) {
        
        for(let light of this.primaryLights) {
            const origin = light.position

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

            this.scene.add(new THREE.ArrowHelper(this.raycaster.ray.direction, this.raycaster.ray.origin, 300, 0xff0000) );

            this.scene.assetManager.meshManagerMap.forEach( (meshManager) => {
                console.log(meshManager.getMeshes.value);
                for (let mesh of meshManager.getMeshes.value) {
                    
                    const intersects = this.raycaster.intersectObject(mesh, true);
                    console.log(intersects);
                }
            })
            
            
            

            
        }
    }

    pushToScene(){
        this.scene.add(this);
    }
}
