import {MeshManager} from "@/js/threeExt/modelManagement/meshManager.js";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import * as THREE from 'three';

export class Asset extends SceneElementInterface{

    mesh
    wrappingScene
    sourceUrl
    position;
    rotation;
    scale;
    name;

    animationMixer

    #error;




    constructor(assetData) {
        super();

        this.sourceUrl = assetData.url;
        this.name = assetData.name != null ? assetData.name : assetData.url;
        if(assetData.position)
            this.position = assetData.position;
        else
            this.position = {x:0,y:0, z:0};

        if(assetData.rotation)
            this.rotation = assetData.rotation;
        else
            this.rotation = {x:0,y:0, z:0};

        if(assetData.scale)
            this.scale = assetData.scale;
        else
            this.scale = {x:1,y:1, z:1};

        this.#error = false;
    }

    hasError(){
        return this.#error;
    }

    async load(){
        const manager = MeshManager.getInstance();
        let mesh = await manager.load(this.sourceUrl);
        this.#error = mesh.hasError();
        this.wrappingScene = mesh.parent
        this.mesh = mesh.mesh; // j'ai enlevé le .clone(), ça posait probleme puisque les enfants n'étaient pas affectés
                               // par les transformations, peut-être qu'il avait qq chose à faire là mais ça a l'air de marcher
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        this.mesh.scale.set(this.scale.x, this.scale.y, this.scale.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.animationMixer = new THREE.AnimationMixer(this.mesh)

        if(mesh.hasAnimations()) {
           this.animationMixer.clipAction(mesh?.parent?.animations[0])
            let action = this.animationMixer._actions[0]
            console.log(action)
            action.play()
        }
    }

    pushToScene(scene){
        if(!this.mesh) return false;
        scene.add(this.mesh);
        return true;
    }
}
