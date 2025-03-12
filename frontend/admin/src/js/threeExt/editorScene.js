import * as THREE from "three";
import {Asset} from "@/js/threeExt/modelManagement/asset.js";
import {computed, nextTick, ref, watch} from "vue";
import {GridPlane} from "@/js/threeExt/lighting/gridPlane.js";
import {LightSet} from "@/js/threeExt/lighting/lightSet.js";
import {LabelManager} from "@/js/threeExt/postprocessing/labelManager.js";
import {AssetManager} from "@/js/threeExt/modelManagement/assetManager.js";
import {MeshManager} from "@/js/threeExt/modelManagement/meshManager.js";
import {getFileExtension} from "@/js/utils/fileUtils.js";
import i18n from "@/i18n.js";


export class EditorScene extends THREE.Scene {
    meshManager;
    assetManager;
    labelManager;
    #errors;
    #gridPlane;
    #lightSet;
    #transformControls;

    onChanged;
    #currentTransformMode;
    #selected;
    currentSelectedValues;
    currentSelectedMaterialValues;

    constructor(shadowMapSize) {
        super();
        this.meshManager = new MeshManager();
        this.labelManager = new LabelManager();
        this.assetManager = new AssetManager(this.meshManager);
        this.#errors = ref([]);
        this.#lightSet = new LightSet(shadowMapSize);
        this.#lightSet.pushToScene(this);
        this.#transformControls = null;
        this.#currentTransformMode = ref(null);
        this.#selected = ref(null);
        this.currentSelectedValues = ref({x:"",y:"", z:""});

        watch(() =>this.currentSelectedValues, (value) => {
            if(this.#selected.value == null) return;


            if(this.getTransformMode.value === "translate"){
                this.#selected.value.getObject().position.set(value.value.x, value.value.y, value.value.z);
            }else if(this.getTransformMode.value === "rotate"){
                this.#selected.value.getObject().rotation.set(value.value.x, value.value.y, value.value.z);
            }else if(this.getTransformMode.value === "scale"){
                this.#selected.value.getObject().scale.set(value.value.x, value.value.y, value.value.z);
            }

            this.updatePlaygroundSize();
            this.runOnChanged();
        },{deep:true});

        this.onChanged = null;

    }

    getMeshMap(meshes) {
        let map = new Map()
        meshes.forEach( (mesh) => {
            map.set(mesh.id,mesh)
        })
        return map
    }

    init(sceneData){
        this.assetManager.setMeshData(this.getMeshMap(sceneData.meshes));
        for (let assetData of sceneData.assets) {
            const asset = new Asset(assetData);
            this.assetManager.addToScene(this, asset,()=>{this.updatePlaygroundSize()});
        }

        for (let labelData of sceneData.labels) {
            this.labelManager.addToScene(this,labelData);
        }

        this.#gridPlane = new GridPlane();
        this.#gridPlane.pushToScene(this);
        this.assetManager.onMoved = ()=>{this.updatePlaygroundSize()};
    }

    setupControls(controls){
        this.#transformControls = controls;
        this.add(this.#transformControls);
        this.setTransformMode("translate");

        this.#transformControls.addEventListener('objectChange', () => {
            this.#updateSelectedValues();
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

            for (let asset of this.assetManager.getAssets.value) {
                const intersects = raycaster.intersectObject(asset.getObject(), true);
                if (intersects.length > 0) {
                    object = asset;
                }
            }
        }

        this.setSelected(object);

    }

    setSelected(object, selected = true){
        this.deselectAll();
        this.#selected.value = object;

        if(object==null || selected === false || object.hasError.value){
            this.#transformControls.detach();
        }else {
            this.#transformControls.attach(object.getObject());
            object.setSelected(selected);
        }
        this.#updateSelectedValues();
    }

    deselectAll(){
        this.#clearSelectedLabels();
        this.#clearSelectedObjects();
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
        this.assetManager.addToScene(this,asset,(asset)=>this.setSelected(asset));
    }

    removeAsset(asset){
        this.setSelected(null);
        this.assetManager.removeFromScene(this,asset);
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
        this.#updateSelectedValues();
    }

    getTransformMode = computed(()=>this.#currentTransformMode.value)



    runOnChanged(){
        if(this.onChanged)
            this.onChanged();
    }

    #updateSelectedValues(){
        if(this.#selected.value == null)
            this.currentSelectedValues.value = {x:"",y:"", z:""};
        else if(this.getTransformMode.value === "translate"){
            this.currentSelectedValues.value = this.#selected.value.getResultPosition();
        }else if(this.getTransformMode.value === "rotate"){
            this.currentSelectedValues.value = this.#selected.value.getResultRotation();
        }else if(this.getTransformMode.value === "scale"){
            this.currentSelectedValues.value = this.#selected.value.getResultScale();
        }
    }

}

