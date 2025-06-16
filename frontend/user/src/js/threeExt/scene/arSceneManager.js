import {ArScene} from "@/js/threeExt/scene/arScene.js";
import {ScenePlacementManager} from "@/js/threeExt/scene/scenePlacementManager.js";
import {computed, ref, watch} from "vue";
import {LightSet} from "@/js/threeExt/lighting/lightSet.js";
import {ActionManager} from "@/js/threeExt/TriggerManagement/actionManager.js";
import * as THREE from "three";

export class ArSceneManager{
    scenes;
    activeSceneId;

    scenePlacementManager;
    #lightEstimate;
    isArRunning;

    onSceneChanged;

    actionManager;

    constructor(scenes, shadowMapSize) {
        this.isArRunning = ref(false);
        this.#lightEstimate = new LightSet(shadowMapSize);
        this.scenePlacementManager = new ScenePlacementManager();

        this.scenes = [];
        for (let sceneData of scenes) {
            this.scenes.push(new ArScene(sceneData));
        }

        if(this.scenes.length === 0)
            this.scenes.push(new ArScene({id:0, title:"None",
                assets:[], triggers:[], sounds: []}));

        this.activeSceneId = ref(this.scenes[0].sceneId);

        this.onSceneChanged = null

        watch(this.active, (value) => {
            this.#updateLighting();
            this.active.value.resetLabels();
            this.active.value.resetTriggers();
            if(this.onSceneChanged != null)
                this.onSceneChanged();
        })

        const scene = this.scenes[0];
        this.actionManager = new ActionManager({
            triggers :scene.getTriggers(),
            sounds: scene.getSounds()  ,
            assets: scene.getAssets(),
            scenes: this.scenes,
            changeScene: (scene)=>{this.setScene(this.getScene(scene))},
            labelPlayer: this.active.value.labelPlayer,
        });
    }

    activeSceneIndex = computed(()=>{
        let index = 0;
        for(let scene of this.scenes) {
            if(scene.sceneId === this.activeSceneId.value)
                return index;
            index++;
        }
        return 0;
    })

    async init(){
        await this.scenePlacementManager.init()
        for (let scene of this.scenes) {
            await scene.init();
        }
        this.setFirstActive();
        this.#updateLighting();

    }

    reset(){
        this.scenePlacementManager.reset();
        this.setFirstActive();
    }

    resetScene(){
        console.log("ArSceneManager Reset")

        this.active.value.resetScene()
        this.#updateLighting();
    }


    getBoundingSphere(){
        return this.active.value.computeBoundingSphere();
    }

    #updateLighting(){
        this.#lightEstimate.pushToScene(this.active.value);

        if(this.scenePlacementManager.isEnabled.value) return
        const bounds = this.active.value.computeBoundingBox(false);

        const boundsMin = bounds.min.negate();
        const boundsMax = bounds.max;

        const maxVector = boundsMin.max(boundsMax)
        const maxComponent = Math.max(maxVector.x, maxVector.z);

        const double = maxComponent*2

        this.#lightEstimate.setLightPosition(double, double, double);
    }

    setFirstActive(){
        const first = this.scenes[0];
        this.activeSceneId.value = first.sceneId;
    }


    setPreviousActive(){
        if(this.hasPrevious){
            this.activeSceneId.value = this.previous.value.sceneId;
        }
    }

    setNextActive(){
        if(this.hasNext){
            this.activeSceneId.value = this.next.value.sceneId;
        }
    }

    active = computed(()=>{
        return this.scenePlacementManager.isEnabled.value && this.isArRunning.value ? this.scenePlacementManager : this.scenes[this.activeSceneIndex.value];
    })

    next = computed(()=>{
        if(!this.hasNext.value) return null;
        return this.scenes[this.activeSceneIndex.value + 1];
    })

    previous = computed(()=>{
        if(!this.hasPrevious.value) return null;
        return this.scenes[this.activeSceneIndex.value - 1];
    })

    hasNext = computed(()=>{
        return this.activeSceneIndex.value < this.scenes.length - 1;
    })
    hasPrevious = computed(()=>{
        return this.activeSceneIndex.value > 0;
    })


    onXrFrame(time, frame, localSpace, cameraPosition){
        // this.#lightEstimate.onXrFrame(time, frame, lightProbe);
        this.active.value.onXrFrame(time, frame, localSpace, this.scenePlacementManager.getWorldTransformMatrix(), cameraPosition, this.isArRunning.value);

        if (this.isArRunning.value && !this.scenePlacementManager.isEnabled.value){
            const activeScene = this.getActiveScene();
            const triggers = activeScene.getTriggers();


            for (let trigger of triggers) {
                const triggerWordlPosition = new THREE.Vector3();
                trigger.mesh.getWorldPosition(triggerWordlPosition);

                const distanceWorld = this.calculateDistanceTriggers(cameraPosition, triggerWordlPosition);

                if (distanceWorld < trigger.getRadius()) {
                    trigger.userIn();
                    trigger.play();
                } else{
                    trigger.userOut();
                    trigger.pause();
                }

            }
        }
    }

    onSceneClick(event) {
        if (this.scenePlacementManager.isStabilized.value && this.scenePlacementManager.isEnabled.value){
            this.scenePlacementManager.disable();
            this.startSounds();
        }
    }

    getScenes() {
        return this.scenes
    }

    calculateDistanceTriggers(cameraPosition, triggerPosition) {
        const X = (cameraPosition.x - triggerPosition.x);
        const Y = (cameraPosition.y - triggerPosition.y);
        const Z = (cameraPosition.z - triggerPosition.z);

        const distance = Math.sqrt((X * X) + (Y * Y )+ (Z * Z));

        return distance.toFixed(2);
    }


    getActiveScene(){
        for (let scene of this.scenes) {
            if (scene.sceneId === this.activeSceneId.value){
                return scene;
            }
        }
    }

    setScene(scene){
        if (scene !== null){
            if (this.activeSceneId.value === scene.sceneId) { return; }
            this.getActiveScene().stopAllSounds();
            this.activeSceneId.value = scene.sceneId;
            this.#changeActionManager(scene);

            scene.startSounds();
            return 0;
        }
        else{
            console.error("Impossible to change scene is null");
            return 1;
        }
    }

    getScene(sceneTitle){
        for (let scene of this.scenes) {
            if (scene.title === sceneTitle){
                return scene;
            }
        }

        console.error("No scene found with that title! " +  sceneTitle);
        return null;
    }


    #changeActionManager(scene){
        this.actionManager.changeParameters({
            triggers :scene.getTriggers(),
            sounds: scene.getSounds()  ,
            assets: scene.getAssets(),
            labelPlayer: scene.labelPlayer,
        });
    }

    startSounds(){
        this.getActiveScene().startSounds();
    }


}
