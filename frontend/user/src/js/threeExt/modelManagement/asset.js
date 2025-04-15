import {MeshManager} from "@/js/threeExt/modelManagement/meshManager.js";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import * as THREE from 'three';

export class Asset extends SceneElementInterface{

    mesh
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

        this.mesh = mesh.mesh;
        if(mesh?.animations?.length > 0) {
            console.log("les anims sont ", mesh.animations);
            this.mesh.animations = mesh.animations
            console.log("donc ", this.mesh.animations);
        }
        //TODO : enlever le clone n'est pas la solution, il faudrait arriver faire un deep copy via clone


        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        this.mesh.scale.set(this.scale.x, this.scale.y, this.scale.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.animationMixer = new THREE.AnimationMixer(this.mesh)

        if(this.mesh?.animations?.length > 0) {
           this.animationMixer.clipAction(this.mesh?.animations[0])
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
