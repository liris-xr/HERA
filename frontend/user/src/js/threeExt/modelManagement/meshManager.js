import {computed, shallowReactive} from "vue";
import * as THREE from "three";

export class MeshManager {
    #meshes

    constructor() {
        this.#meshes = shallowReactive([]);
    }

    getMeshes = computed(()=>{
        return this.#meshes;
    });

    addSubMesh(scene,meshData) {
        const mesh = new THREE.Vector3()

        if(meshData) {
            mesh.position.x = meshData.position.x 
            mesh.position.y = meshData.position.y 
            mesh.position.z = meshData.position.z 
            
            mesh.rotation.x = meshData.rotation._x
            mesh.rotation.y = meshData.rotation._y
            mesh.rotation.z = meshData.rotation._z
            mesh.scale.x = meshData.scale.x
            mesh.scale.y = meshData.scale.y
            mesh.scale.z = meshData.scale.z
            
            mesh.material.color = meshData.color
            mesh.material.opacity = meshData.opacity
            mesh.material.transparent = meshData.opacity != 1
            mesh.material.emissive = meshData.emissive
            mesh.material.emissiveIntensity = meshData.emissiveIntensity
            mesh.material.roughness = meshData.roughness
            mesh.material.metalness = meshData.metalness
        }
        
        scene.add( mesh );
        this.#meshes.push(mesh)
    }

    clear(scene) {
        this.#meshes.forEach( (mesh) => {
            scene.remove(mesh)
        })
        this.#meshes = []
    }
}
