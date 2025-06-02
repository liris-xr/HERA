import {MeshManager} from "@/js/threeExt/modelManagement/meshManager.js";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import * as THREE from 'three';
import {reactive, ref} from "vue";
import {ObjectManager} from "@/js/threeExt/modelManagement/objectManager.js";

export class Asset extends SceneElementInterface{

    object
    id

    sourceUrl
    position;
    rotation;
    scale;
    name;

    animations
    animationMixer
    activeAnimation
    playingAction

    #error;

    highlight;
    hidden;




    constructor(assetData) {
        super();

        this.id = assetData.id;
        this.sourceUrl = assetData.url;
        this.name = assetData.name != null ? assetData.name : assetData.url;
        this.activeAnimation = assetData.activeAnimation || null;
        this.highlight = ref(false)
        this.hidden = ref(false)
        this.animations = reactive([])

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

    playAnimation(name) {
        if(!this.animationMixer) return;

        if(this.playingAction) {
            this.playingAction.stop()
            this.playingAction = null
            this.activeAnimation = null
        }

        if(name) {
            const anim = THREE.AnimationClip.findByName(this.object.animations, name)

            if(!anim) return

            const action = this.animationMixer.clipAction(anim)
            action.play()
            this.activeAnimation = name

            this.playingAction = action

        }
    }

    async load(){
        const manager = ObjectManager.getInstance();
        let object = await manager.load(this.sourceUrl);
        this.#error = object.hasError();
        this.object = object.object;
        this.object.position.set(this.position.x, this.position.y, this.position.z);
        this.object.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        this.object.scale.set(this.scale.x, this.scale.y, this.scale.z);
        this.object.castShadow = true;
        this.object.receiveShadow = true;

        if(this.object?.animations?.length > 0) {
            this.animationMixer = new THREE.AnimationMixer(this.object)
            let baseAnimation

            for(const animation of this.object?.animations){
                if (animation.name === this.activeAnimation)
                    baseAnimation = this.animationMixer.clipAction(animation);
                this.animations.push(animation.name)
            }

            this.animationMixer = new THREE.AnimationMixer(this.mesh)
            this.animationMixer.clipAction(this.mesh?.animations[0])
            let action = this.animationMixer.clipAction(THREE.AnimationClip.findByName(this.mesh?.animations, this.activeAnimation))

            if(!baseAnimation) {
                if(this.activeAnimation)
                    console.error("Animation " + this.activeAnimation + " not found for asset " + this.name)
                return
            }
            baseAnimation.play()
            this.playingAction = baseAnimation
        }
    }

    pushToScene(scene){
        if(!this.object) return false;
        scene.add(this.object);
        return true;
    }
}
