import {MeshManager} from "@/js/threeExt/modelManagement/meshManager.js";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import * as THREE from 'three';

export class Asset extends SceneElementInterface{

    id

    mesh
    sourceUrl
    position;
    rotation;
    scale;
    name;

    animations
    animationMixer
    activeAnimation

    #error;




    constructor(assetData) {
        super();

        this.id = assetData.id;
        this.sourceUrl = assetData.url;
        this.name = assetData.name != null ? assetData.name : assetData.url;
        this.activeAnimation = assetData.activeAnimation || null;

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
            this.mesh.animations = mesh.animations
        }

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        this.mesh.scale.set(this.scale.x, this.scale.y, this.scale.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;


        if(this.mesh?.animations?.length > 0) {
            this.animationMixer = new THREE.AnimationMixer(this.mesh)
            this.animations = []
            let baseAnimation

            for(const animation of this.mesh?.animations){
                const action = this.animationMixer.clipAction(animation);
                if (animation.name === this.activeAnimation)
                    baseAnimation = action
                this.animations.push(animation.name)
            }

            if(!baseAnimation) {
                if(this.activeAnimation)
                    console.error("Animation " + this.activeAnimation + " not found for asset " + this.name)
                return
            }
            baseAnimation.play()
        }
    }

    pushToScene(scene){
        if(!this.mesh) return false;
        scene.add(this.mesh);
        return true;
    }
}
