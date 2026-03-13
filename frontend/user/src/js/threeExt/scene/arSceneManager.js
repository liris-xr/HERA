import {ArScene} from "@/js/threeExt/scene/arScene.js";
import {ScenePlacementManager} from "@/js/threeExt/scene/scenePlacementManager.js";
import {computed, ref, watch} from "vue";
import {LightSet} from "@/js/threeExt/lighting/lightSet.js";
import {ArRecordManager} from "@/js/threeExt/scene/arRecordManager.js";
import {ENDPOINT} from "@/js/endpoints.js";
import * as THREE from "three";

export class ArSceneManager{
    scenes;
    activeSceneId;

    camera;
    currentFrame = 0;
    startRecording = true;
    recordManager;

    scenePlacementManager;
    #lightEstimate;
    isArRunning;

    onSceneChanged


    constructor(scenes, shadowMapSize, xr=false) {
        this.isArRunning = ref(false);
        this.#lightEstimate = new LightSet(shadowMapSize);
        this.scenePlacementManager = new ScenePlacementManager();
        this.recordManager = new ArRecordManager();

        this.scenes = [];
        for (let sceneData of scenes) {
            this.scenes.push(new ArScene(sceneData, xr));
        }
        if(this.scenes.length === 0)
            this.scenes.push(new ArScene({id:0, title:"None", assets:[]}));

        this.activeSceneId = ref(this.scenes[0].sceneId);
        this.startRecording = this.scenes[0].recordUser ?? false;

        this.onSceneChanged = null

        watch(this.active, (value) => {
            this.#updateLighting();
            this.active.value.resetLabels();
            if(this.onSceneChanged != null)
                this.onSceneChanged();
        })

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

    startRecordingScene(){
        if(this.startRecording){

            this.stopRecordingScene();
            this.currentFrame = 0;

            this.recordManager.intervalRecordId = setInterval(async () => {
                if(this.scenePlacementManager.isEnabled.value || !this.camera) return;

                this.camera.updateMatrixWorld();
                const sceneAnchorMatrix = this.scenePlacementManager.getWorldTransformMatrix();
                const inverseSceneMatrix = new THREE.Matrix4().copy(sceneAnchorMatrix).invert();
                const relativeCameraMatrix = new THREE.Matrix4()
                    .multiplyMatrices(inverseSceneMatrix, this.camera.matrixWorld);

                this.currentFrame += this.recordManager.getSecondsBetweenEachRecord();
                await this.recordManager.addToBuffer(
                    {
                        sceneId: this.activeSceneId.value,
                        time: Date.now().toString(),
                        frame: this.currentFrame,
                        matrix: [ ...relativeCameraMatrix.elements ]
                    });
            }, this.recordManager.recordTimerMs);

            this.recordManager.intervalSendRecordsId = setInterval(async () => {
                await this.recordManager.sendData();
            }, this.recordManager.sendRecordsTimerMs);
        }
    }

    stopRecordingScene(){
        if(this.recordManager){
            if(this.recordManager.intervalRecordId !== (-1)) clearInterval(this.recordManager.intervalRecordId);
            if(this.recordManager.intervalSendRecordsId !== (-1)) clearInterval(this.recordManager.intervalSendRecordsId);
        }
    }

    reset(){
        this.scenePlacementManager.reset();
        this.setFirstActive();
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
        this.startRecording = first.recordUser ?? false;
    }


    setPreviousActive(){
        if(this.hasPrevious.value){
            this.activeSceneId.value = this.previous.value.sceneId;
            this.startRecording = this.previous.value.recordUser ?? false;
            this.startRecordingScene();
        }
    }

    setNextActive(){
        if(this.hasNext.value){
            this.activeSceneId.value = this.next.value.sceneId;
            this.startRecording = this.next.value.recordUser ?? false;
            this.startRecordingScene();
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


    onXrFrame(time, frame, localSpace, camera, renderer){
        // this.#lightEstimate.onXrFrame(time, frame, lightProbe);
        this.camera = camera;
        this.active.value.onXrFrame(time, frame, localSpace, this.scenePlacementManager.getWorldTransformMatrix(), camera, renderer);
    }

    onSceneClick(event){
        if(this.scenePlacementManager.isStabilized.value && this.scenePlacementManager.isEnabled.value) {
            this.scenePlacementManager.disable();
        }
    }

    getScenes() {
        return this.scenes
    }

    setXr(xr) {
        for(let scene of this.scenes)
            scene.labelPlayer.setXr(xr)
    }


}
