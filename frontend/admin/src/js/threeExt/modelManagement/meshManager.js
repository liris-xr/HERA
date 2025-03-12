import {computed, shallowReactive} from "vue";
import * as THREE from "three";


let currentMeshId = 0;
export class MeshManager {

    addSubMesh(scene,mesh,meshData,onAdd) {
        
        
        // mesh.position.x = meshData.position.x 
        // mesh.position.y = meshData.position.y 
        // mesh.position.z = meshData.position.z 
        // mesh.rotation.x = meshData.rotation.x
        // mesh.rotation.y = meshData.rotation.y
        // mesh.rotation.z = meshData.rotation.z
        // mesh.scale.x = meshData.scale.x
        // mesh.scale.y = meshData.scale.y
        // mesh.scale.z = meshData.scale.z 
        
        // mesh.material.opacity = meshData.opacity
        // mesh.material.transparent = meshData.opacity != 1
        // mesh.material.emissiveColor = meshData.emissiveColor
        // mesh.material.emissiveIntensity = meshData.emissiveIntensity
        // mesh.material.roughness = meshData.roughness
        // mesh.material.metalness = meshData.metalness
        
        // console.log(mesh);
        // scene.add(mesh)
        
        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
        const meshh = new THREE.Mesh( geometry, material );
        // meshh.geometry = mesh.geometry
        // meshh.material = mesh.material
        scene.add( meshh );
        console.log(scene);
        
        
        // console.log(scene);
        // const m = new THREE.Mesh( mesh.geometry,mesh.material );
        // scene.add( m );
        // if(onAdd)
        //     onAdd(m)
        
        // scene.add(mesh)
        
    }
}