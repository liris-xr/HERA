import * as THREE from "three";
import {Asset} from "@/js/threeExt/modelManagement/asset.js";
import {Trigger} from "@/js/threeExt/TriggerManagement/trigger.js";
import {computed} from "vue";
import {ArMeshLoadError} from "@/js/threeExt/error/arMeshLoadError.js";
import {ShadowPlane} from "@/js/threeExt/lighting/shadowPlane.js";
import {AbstractScene} from "@/js/threeExt/scene/abstractScene.js";
import {LabelPlayer} from "@/js/threeExt/postProcessing/labelPlayer.js";
import {EmptyAsset} from "@/js/threeExt/modelManagement/emptyAsset.js";
import {EXRLoader} from "three/addons";
import {getResource} from "@/js/endpoints.js";
import {Sound} from "@/js/threeExt/SoundManagement/sound.js";

export class ArScene extends AbstractScene {
    sceneId
    title;
    description;
    #assets
    #triggers
    #sounds
    labelPlayer;
    #shadowPlane
    #errors;
    #boundingSphere
    #boundingBox;
    clock

    #audioLoader;
    #listener;
    #activeSounds;

    constructor(sceneData) {
        super();
        this.sceneId = sceneData.id;
        this.title = sceneData.title;
        this.description = sceneData.description;
        this.#assets = [];
        for (let assetData of sceneData.assets) {
            this.#assets.push(new Asset(assetData));
        }

        this.#triggers = [];
        for (let triggerData of sceneData.triggers) {
            this.#triggers.push(new Trigger(triggerData));
        }

        this.#sounds = [];
        for (let soundData of sceneData.sounds) {
            this.#sounds.push(new Sound(soundData));
        }


        if(this.#assets.length == 0) this.#assets.push(new EmptyAsset())

        this.labelPlayer = new LabelPlayer();
        for (let labelData of sceneData.labels) {
            this.labelPlayer.addToScene(this,labelData);
        }

        this.#errors = [];
        this.#boundingSphere = null;
        this.#boundingBox = null;

        if(sceneData.envmapUrl)
            this.environment = new EXRLoader()
                .load(getResource(sceneData.envmapUrl), (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping

                    // this.background = texture
                })

        this.clock = new THREE.Clock();

        this.#audioLoader = new THREE.AudioLoader();
        this.#listener = new THREE.AudioListener();
        this.#activeSounds = [];
    }

    async init(){
        for (let assetData of this.#assets) {
            await assetData.load();
            if(assetData.hasError()){
                this.#errors.push(new ArMeshLoadError(assetData.sourceUrl));
            }
            assetData.pushToScene(this);
        }

        for (let triggerData of this.#triggers) {
            if (!triggerData.hideInViewer){
                await triggerData.load();
                triggerData.pushToScene(this);
            }

        }

        for (let soundData of this.#sounds) {
            if(soundData.playOnStartup){
                const audio = new THREE.Audio(this.#listener);
                this.#audioLoader.load(getResource(soundData.url), (buffer) => {
                    audio.setBuffer(buffer);
                    audio.setLoop(soundData.isLoopingEnabled);
                    audio.setVolume(1);
                    audio.play();
                    soundData.play();
                    this.#activeSounds.push([soundData, audio]);
                });
            }
        }

        this.computeBoundingSphere(true);
        this.#shadowPlane = new ShadowPlane(this.computeBoundingBox(false));
        this.#shadowPlane.pushToScene(this);
    }

    getErrors = computed(()=>{
        return this.#errors;
    })

    hasDescription(){
        return this.description  != null && this.description.trim().length>0
    }

    hasLabels = computed(()=>{
        return this.labelPlayer.hasLabels.value;
    })

    hasAnimation = computed(()=>{
        return this.hasLabels.value && this.labelPlayer.getDuration()>0;
    })

    resetLabels = ()=>{
        this.labelPlayer.reset();
    }


    computeBoundingBox(forceCompute = false){
        if(forceCompute || this.#boundingBox==null){
            const group = new THREE.Group();
            for (let asset of this.#assets) {
                group.add(asset.mesh.clone());
            }
            this.#boundingBox = new THREE.Box3().setFromObject(group);
        }
        return this.#boundingBox;
    }

    computeBoundingSphere(forceCompute = false) {
        if(forceCompute || this.#boundingSphere==null){
            const center = new THREE.Vector3();
            this.computeBoundingBox(forceCompute).getCenter(center);
            this.#boundingSphere = this.computeBoundingBox().getBoundingSphere(new THREE.Sphere(center));
        }
        return this.#boundingSphere;
    }


    onXrFrame(time, frame, localReferenceSpace, worldTransformMatrix, cameraPosition){
        worldTransformMatrix.decompose( this.position, this.quaternion, this.scale );

        // animation
        const delta = this.clock.getDelta()
        for(let asset of this.#assets)
            if (asset.animationMixer)
                asset.animationMixer.update(delta)


        this.labelPlayer.onXrFrame(time, frame, localReferenceSpace, worldTransformMatrix, cameraPosition);
    }

    getTriggers(){
        return this.#triggers;
    }

    getAssets(){
        return this.#assets;
    }

    getSounds(){
        return this.#sounds;
    }

    stopAllSounds() {
        this.#activeSounds.forEach(sound => {
            if (sound[0].isPlaying()) {
                sound[1].stop();
                sound[0].stop();
            }
        });
        this.#activeSounds.length = [];
    }
}
