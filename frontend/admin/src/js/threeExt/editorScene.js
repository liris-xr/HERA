import * as THREE from "three";
import {Asset} from "@/js/threeExt/modelManagement/asset.js";
import {computed, nextTick, ref, toRaw, watch} from "vue";
import {GridPlane} from "@/js/threeExt/lighting/gridPlane.js";
import {LightSet} from "@/js/threeExt/lighting/lightSet.js";
import {LabelManager} from "@/js/threeExt/postprocessing/labelManager.js";
import {AssetManager} from "@/js/threeExt/modelManagement/assetManager.js";
import {MeshManager} from "@/js/threeExt/modelManagement/meshManager.js";
import {getFileExtension} from "@/js/utils/fileUtils.js";
import i18n from "@/i18n.js";
import {Label} from "@/js/threeExt/postprocessing/label.js";
import {TriggerManager} from "@/js/threeExt/triggerManagement/triggerManager.js";
import {SoundManager} from "@/js/soundManagement/soundManager.js";
import {Sound} from "@/js/soundManagement/sound.js";
import {EXRLoader} from "three/addons";
import {getResource} from "@/js/endpoints.js";
import {ModelLoader} from "@/js/threeExt/modelManagement/modelLoader.js";
import {Trigger} from "@/js/threeExt/triggerManagement/trigger.js";

const transformModeKeys = {
    "translate":"position",
    "rotate":"rotation",
    "scale":"scale"
}

export class EditorScene extends THREE.Scene {
    projectId;
    sceneTitle;
    assetManager;
    labelManager;
    triggerManager;
    soundManager;
    meshMap;
    #errors;
    #gridPlane;
    #lightSet;
    #transformControls;
    vrStartPosition;
    vrCamera;

    selected;
    onChanged;
    #meshSelectionMode
    #currentTransformMode;
    currentSelectedTransformValues;
    currentSelectedMaterialValues;

    currentMeshes;
    currentMeshGroup;
    transformBeforeChange;

    #activeSounds;

    constructor(shadowMapSize) {
        super();
        this.labelManager = new LabelManager();
        this.assetManager = new AssetManager();
        this.meshMap = new Map();
        this.triggerManager = new TriggerManager();
        this.soundManager = new SoundManager();
        this.#errors = ref([]);
        this.#lightSet = new LightSet(shadowMapSize);
        this.#lightSet.pushToScene(this);
        this.#transformControls = null;
        this.#currentTransformMode = ref(null);
        this.#meshSelectionMode = ref(false)
        this.selected = ref(null);
        this.currentSelectedTransformValues = ref({x:"",y:"", z:""});
        this.currentSelectedMaterialValues = ref({
            metalness:"",
            roughness:"",
            opacity:"",
            emissiveIntensity:"",
            color:{r:"",g:"",b:""},
            emissive:{r:"",g:"",b:""}
        });
        this.currentMeshes = []
        this.transformBeforeChange = null

        watch(() =>this.currentSelectedTransformValues, (value) => {
            if(this.selected.value == null) return;

            if(this.selected.value instanceof Asset
               || this.selected.value instanceof Label
               || this.selected.value instanceof Trigger) {

                this.selected.value.getObject()[transformModeKeys[this.getTransformMode.value]].set(value.value.x, value.value.y, value.value.z)

                if(this.selected.value.id === "vrCamera") {
                    if(this.getTransformMode.value === "translate") {
                        this.vrStartPosition.position.x = this.selected.value.mesh.position.x
                        this.vrStartPosition.position.y = this.selected.value.mesh.position.y
                        this.vrStartPosition.position.z = this.selected.value.mesh.position.z
                    } else if (this.getTransformMode.value === "rotate") {
                        this.vrStartPosition.rotation.x = this.selected.value.mesh.rotation.x
                        this.vrStartPosition.rotation.y = this.selected.value.mesh.rotation.y
                        this.vrStartPosition.rotation.z = this.selected.value.mesh.rotation.z
                    }
                }

            } else {

                this.selected.value[transformModeKeys[this.getTransformMode.value]].x = value.value.x
                this.selected.value[transformModeKeys[this.getTransformMode.value]].y = value.value.y
                this.selected.value[transformModeKeys[this.getTransformMode.value]].z = value.value.z

            }

            this.updatePlaygroundSize();
            this.runOnChanged();
        },{deep:true});

        watch(() =>this.currentSelectedMaterialValues, (value) => {
            if(this.selected.value == null) return;

            if(this.#meshSelectionMode.value && !this.selected.label){
                this.selected.value.material.roughness = value.value.roughness;
                this.selected.value.material.metalness = value.value.metalness;
                this.selected.value.material.opacity = value.value.opacity;
                this.selected.value.material.transparent = value.value.opacity < 1
                this.selected.value.material.emissiveIntensity = value.value.emissiveIntensity;
            }
        },{deep:true});

        this.onChanged = null;

        this.#activeSounds = [];
    }

    setMeshMap(meshes) {
        meshes.forEach( (mesh) => {
            // this.meshMap.set(mesh.id, mesh)

            if(this.meshMap.get(mesh.assetId))
                this.meshMap.get(mesh.assetId)[mesh.id] = mesh
            else
                this.meshMap.set(mesh.assetId, { [mesh.id]: mesh })
        })
    }

    setSceneTitle(title) {
        this.sceneTitle = title
    }

    init(sceneData){
        this.projectId = sceneData.projectId
        if(sceneData.meshes) {
            this.setMeshMap(sceneData.meshes)
            this.assetManager.setMeshMap(this.meshMap);
        }
        this.setSceneTitle(sceneData.title)
        this.assetManager.setSceneTitle(this.sceneTitle)
        this.assetManager.setProjectId(this.projectId)

        for (let assetData of sceneData.assets) {
            const asset = new Asset(assetData);
            this.assetManager.addToScene(this, asset,()=>{this.updatePlaygroundSize()});
        }

        for (let labelData of sceneData.labels) {
            this.labelManager.addToScene(this,labelData);
        }

        for (let triggerData of sceneData.triggers){
            this.triggerManager.addToScene(this,triggerData);
        }

        for (let soundData of sceneData.sounds) {
            const sound = new Sound(soundData);
            this.soundManager.addToScene(this,sound);
        }

        this.#gridPlane = new GridPlane();
        this.#gridPlane.pushToScene(this);
        this.assetManager.onMoved = ()=>{this.updatePlaygroundSize()};

        if(sceneData.envmapUrl)
            this.environment = new EXRLoader()
                .load(getResource(sceneData.envmapUrl), (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping

                    // this.background = texture
                })

        this.vrStartPosition = sceneData.vrStartPosition;

        if (sceneData.project.displayMode === "vr") {
            const camera = new Asset({
                id: "vrCamera",
                name: "VR Origin",
                url: "public/common/camera.glb"
            })
            this.assetManager.addToScene(this, camera, () => {
                camera.mesh.position.set(this.vrStartPosition.position.x, this.vrStartPosition.position.y, this.vrStartPosition.position.z)
                camera.mesh.rotation.set(this.vrStartPosition.rotation.x, this.vrStartPosition.rotation.y, this.vrStartPosition.rotation.z)
            }, false)

            this.vrCamera = camera;
        }

    }

    setupControls(controls){
        this.#transformControls = controls;
        this.add(this.#transformControls);
        this.setTransformMode("translate");

        this.#transformControls.addEventListener('mouseUp', (event) => {
            this.#updateSelectedTransformValues();

            if(this.selected.value.id === "vrCamera") {
                if(this.getTransformMode.value === "translate") {
                    this.vrStartPosition.position.x = this.selected.value.mesh.position.x
                    this.vrStartPosition.position.y = this.selected.value.mesh.position.y
                    this.vrStartPosition.position.z = this.selected.value.mesh.position.z
                } else if (this.getTransformMode.value === "rotate") {
                    this.vrStartPosition.rotation.x = this.selected.value.mesh.rotation.x
                    this.vrStartPosition.rotation.y = this.selected.value.mesh.rotation.y
                    this.vrStartPosition.rotation.z = this.selected.value.mesh.rotation.z
                }

                console.log(this.vrStartPosition)
                console.log(this.selected.value)
            }
        });
    }

    getErrors = computed(()=>this.#errors.value)


    onFrame(time, frame, cameraPosition){

    }

    onSceneClick(event, camera){
        const target = event.target;
        let object = null;

        if(target.tagName.toLowerCase() === 'div'){ //label clicked
            for (let label of this.labelManager.getLabels.value) {
                if(target.id === label.id){
                    object = label;
                    this.setTransformMode("translate");
                }
            }
        } else{ //scene clicked
            const rect = event.target.getBoundingClientRect();
            const relativeX = event.clientX - rect.left;
            const relativeY = event.clientY - rect.top;

            const mouse = new THREE.Vector2();

            mouse.x = (relativeX / rect.width) * 2 -1;
            mouse.y = -(relativeY / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            if(this.#meshSelectionMode.value) {

                this.assetManager.meshManagerMap.forEach( (meshManager) => {
                    for (let mesh of meshManager.getMeshes.value) {
                        const intersects = raycaster.intersectObject(mesh, true);
                        if (intersects.length > 0) {
                            object = mesh;
                        }
                    }
                })

            } else {

                for (let asset of this.assetManager.getAssets.value) {

                    const intersects = raycaster.intersectObject(asset.getObject(), true);
                    if (intersects.length > 0) {
                        object = asset;
                    }
                }
            }

            for (let trigger of this.triggerManager.getTriggers.value) {
                const intersects = raycaster.intersectObject(trigger.getObject(), true);
                if (intersects.length > 0) {
                    object = trigger;
                }
            }

        }

        this.setSelected(object);
    }
    setSelected(object, selected = true){
        this.deselectAll();
        this.selected.value = object;

        if(object==null || selected === false){
            this.#transformControls.detach();
        } else {
            if(this.#meshSelectionMode.value) {
                if(object.isMesh) {
                    this.#transformControls.attach(object)
                } else if(object.label) {
                    this.#transformControls.attach(object.getObject());
                } else if(object.subMeshes) { // Object is an asset
                    this.#transformControls.attach(object.subMeshes[0])
                }
            } else {
                this.#transformControls.attach(object.getObject())
                object.setSelected(selected)
            }

        }
        this.#updateSelectedTransformValues();
        this.#updateSelectedMaterialValues();
    }

    getSelected() {
        return this.selected.value;
    }

    deselectAll(){
        this.#clearSelectedLabels();
        this.#clearSelectedObjects();
        this.#clearSelectedTrigger();
    }

    #clearSelectedLabels(){
        for (let label of this.labelManager.getLabels.value) {
            label.setSelected(false);
        }
    }

    #clearSelectedObjects(){
        for (let asset of this.assetManager.getAssets.value){
            asset.setSelected(false);
        }
    }

    #clearSelectedTrigger(){
        for(let trigger of this.triggerManager.getTriggers.value){
            trigger.setSelected(false);
        }
    }

    addNewTrigger(){
        const trigger = this.triggerManager.addToScene(this);
        this.setSelected(trigger);
        this.setTransformMode("translate");
    }

    removeTrigger(trigger){
        this.setSelected(null);
        this.triggerManager.removeFromScene(this, trigger);
    }

    addNewSound(soundFile){
        const soundData = {
            id:null,
            url: null,
            uploadData: soundFile,
            name: soundFile.name,
        };

        const sound = new Sound(soundData);
        this.soundManager.addToScene(this,sound);
    }

    removeSound(sound){
        this.setSelected(null);
        this.soundManager.removeFromScene(this, sound);
    }

    playSound(sound){
        const audioLoader = new THREE.AudioLoader();
        const listener = new THREE.AudioListener();
        const audio = new THREE.Audio(listener);
        audioLoader.load(getResource(sound.url), (buffer) => {
            audio.setBuffer(buffer);
            audio.setVolume(sound.volumeLevel);
            audio.play();

            setTimeout(() => {
                if (audio.source) {
                    audio.source.onended = () => {
                        sound.stop()
                    };
                }
            }, 10);
        });

        sound.play();

        this.#activeSounds.push([sound, audio]);
    }

    stopSound(soundCurrentlyPlaying){
        this.#activeSounds.forEach(sound => {
            if (sound[0].id === soundCurrentlyPlaying.id) {
                sound[1].stop();
                sound[0].stop();
            }
        });
    }

    setVolume(soundCurrentlyPlaying){
        this.#activeSounds.forEach(sound => {
            if (sound[0].id === soundCurrentlyPlaying.id) {
                sound[1].setVolume(soundCurrentlyPlaying.volumeLevel);

            }
        });
    }

    duplicateSound(sound){
        this.setSelected(null);

        const soundData = {
            id:sound.id,
            url: sound.sourceUrl,
            name: sound.name,
            copiedUrl: sound.sourceUrl,
            playOnStartup: sound.playOnStartup.value,
            isLoopingEnabled: sound.isLoopingEnabled.value,
        };

        const newSound = new Sound(soundData);
        this.soundManager.addToScene(this,newSound);
    }



    addNewLabel(){
        const label = this.labelManager.addToScene(this);
        this.setSelected(label)
        this.setTransformMode("translate");
    }

    removeLabel(label){
        this.setSelected(null);
        this.labelManager.removeFromScene(this,label);
    }


    addNewAsset(file){

        const extension = getFileExtension(file.name);
        if(!["gltf", "glb"].includes(extension)){
            alert(i18n.global.t("sceneView.leftSection.sceneAssets.addAssetButtonErrorFileNotSupported"));
            return;
        }
        const assetData = {
            id:null,
            url: null,
            uploadData: file,
            name: file.name,
            hideInViewer: false
        }
        const asset = new Asset(assetData);
        this.assetManager.addToScene(this,asset,()=>{this.updatePlaygroundSize()},this.title);
    }

    removeAsset(asset){
        this.setSelected(null);
        this.assetManager.removeFromScene(this,asset);
        this.updatePlaygroundSize()
    }

    duplicateAsset(asset){
        this.setSelected(null);

        const assetData = {
            id:null,
            url: asset.sourceUrl,
            name: asset.name,
            hideInViewer: asset.hideInViewer,
            position: asset.position,
            rotation: asset.rotation,
            scale: asset.scale,
            copiedUrl: asset.sourceUrl ?? asset.copiedUrl,
        }
        const newAsset = new Asset(assetData);

        this.assetManager.addToScene(this,newAsset,(newAsset)=>this.setSelected(newAsset));

        // this.assetManager.duplicateFromScene(this,asset);
    }

    removeSelected(){
        const selected = toRaw(this.getSelected())

        if(selected instanceof Asset)
            this.removeAsset(selected)

        else if (selected instanceof Label)
            this.removeLabel(selected)
    }


    appendError(error){
        this.#errors.value.push(error);
    }

    updatePlaygroundSize(){
        const bounds = this.assetManager.getSceneBoundingBox();

        const boundsMin = bounds.min.negate();
        const boundsMax = bounds.max;

        const maxVector = boundsMin.max(boundsMax)
        const maxComponent = Math.max(maxVector.x, maxVector.z);

        const double = maxComponent*2

        this.remove(this.#gridPlane);
        this.#gridPlane = new GridPlane(double);
        this.#gridPlane.pushToScene(this);

        this.#lightSet.setLightPosition(double, double, double);
    }

    setTransformMode(mode){
        this.#transformControls.setMode(mode);
        this.#currentTransformMode.value = mode;
        this.#updateSelectedTransformValues();
    }

    setMaterialMenu(value) {
        this.setSelected(null)

        this.#meshSelectionMode.value = value
        this.#updateSelectedMaterialValues()
    }

    getTransformMode = computed(()=>this.#currentTransformMode.value)

    runOnChanged(){
        if(this.onChanged)
            this.onChanged();
    }

    #updateSelectedTransformValues(){

        if(this.selected.value instanceof Asset ||
            this.selected.value instanceof Label ||
            this.selected.value instanceof Trigger) {

            if(this.getTransformMode.value === "translate"){
                this.currentSelectedTransformValues.value = this.selected.value.getResultPosition();
            }else if(this.getTransformMode.value === "rotate"){
                this.currentSelectedTransformValues.value = this.selected.value.getResultRotation();
            }else if(this.getTransformMode.value === "scale"){
                this.currentSelectedTransformValues.value = this.selected.value.getResultScale();
            }

        } else {

            if(!this.selected.value)
                this.currentSelectedTransformValues.value = {x:"",y:"", z:""};
            else if(this.getTransformMode.value === "translate"){
                this.currentSelectedTransformValues.value = {...this.selected.value.position};
            }else if(this.getTransformMode.value === "rotate"){
                this.currentSelectedTransformValues.value = {...this.selected.value.rotation};
            }else if(this.getTransformMode.value === "scale"){
                this.currentSelectedTransformValues.value = {...this.selected.value.scale};
            }

        }

    }

    #updateSelectedMaterialValues() {

        if(this.selected.value?.isObject3D) {
            this.currentSelectedMaterialValues.value = {
                metalness:this.selected.value.material.metalness,
                roughness:this.selected.value.material.roughness,
                opacity:this.selected.value.material.opacity,
                emissiveIntensity:this.selected.value.material.emissiveIntensity,
                color:this.selected.value.material.color,
                emissive:this.selected.value.material.emissive
            }
        } else {
            this.currentSelectedMaterialValues.value = {
                metalness:"",
                roughness:"",
                opacity:"",
                emissiveIntensity:"",
                color:{r:"",g:"",b:""},
                emissive:{r:"",g:"",b:""}
            }
        }

    }

    updateRadius(radius){
        this.selected.value.getObject().scale.set(radius, radius, radius);
    }
}

