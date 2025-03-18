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
    assetManager;
    labelManager;
    #errors;
    #gridPlane;
    #lightSet;
    #transformControls;
    
    selected;
    selectedMeshKey;
    onChanged;
    #isMaterialMenuAvailable
    #currentTransformMode;
    currentSelectedTransformValues;
    currentSelectedMaterialValues;

    constructor(shadowMapSize) {
        super();
        this.labelManager = new LabelManager();
        this.assetManager = new AssetManager();
        this.#errors = ref([]);
        this.#lightSet = new LightSet(shadowMapSize);
        this.#lightSet.pushToScene(this);
        this.#transformControls = null;
        this.#currentTransformMode = ref(null);
        this.#isMaterialMenuAvailable = ref(false)
        this.currentSelectedTransformValues = ref({x:"",y:"", z:""});
        this.currentSelectedMaterialValues = ref({
            metalness:"",
            roughness:"",
            opacity:"",
            emissiveIntensity:"",
            color:{r:"",g:"",b:""},
            emissive:{r:"",g:"",b:""}
        });

        watch(() =>this.currentSelectedTransformValues, (value) => {
            if(this.selected == null) return;

            if(this.getTransformMode.value === "translate"){
                this.selected.position.x = value.value.x
                this.selected.position.y = value.value.y
                this.selected.position.z = value.value.z
            }else if(this.getTransformMode.value === "rotate"){
                this.selected.rotation.x = value.value.x
                this.selected.rotation.y = value.value.y
                this.selected.rotation.z = value.value.z
            }else if(this.getTransformMode.value === "scale"){
                this.selected.scale.x = value.value.x
                this.selected.scale.y = value.value.y
                this.selected.scale.z = value.value.z
            }

            this.updatePlaygroundSize();
            this.runOnChanged();
        },{deep:true});

        watch(() =>this.currentSelectedMaterialValues, (value) => {
            if(this.selected == null) return;
            
            if(this.#isMaterialMenuAvailable.value){
                this.selected.material.roughness = value.value.roughness;
                this.selected.material.metalness = value.value.metalness;
                this.selected.material.opacity = value.value.opacity;
                this.selected.material.emissiveIntensity = value.value.emissiveIntensity;
            }
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
            this.#updateSelectedTransformValues();
            this.#updateSelectedMaterialValues();
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


            this.assetManager.meshManagerMap.forEach( (meshManager) => {
                for (let mesh of meshManager.getMeshes.value) {
                    const intersects = raycaster.intersectObject(mesh, true);
                    if (intersects.length > 0) {
                        object = mesh;
                    }
                }
            })
        }
        
        this.setSelected(object);

    }
    setSelected(object, selected = true){
        this.deselectAll();
        this.selected = object;
        if(object==null || selected === false){
            this.#transformControls.detach();
        } else {
            this.selectedMeshKey = "mesh-"+object.name
            if(object.isMesh)
                this.#transformControls.attach(object);
        }
        this.#updateSelectedTransformValues();
        this.#updateSelectedMaterialValues();
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
        this.assetManager.addToScene(this,asset,()=>{this.updatePlaygroundSize()});
    }

    removeAsset(asset){
        this.setSelected(null);
        this.assetManager.removeFromScene(this,asset);
        this.updatePlaygroundSize()
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
        this.#isMaterialMenuAvailable = value
        this.#updateSelectedMaterialValues()
    }

    getTransformMode = computed(()=>this.#currentTransformMode.value)

    runOnChanged(){
        if(this.onChanged)
            this.onChanged();
    }

    #updateSelectedTransformValues(){
        
        if(!this.selected)
            this.currentSelectedTransformValues.value = {x:"",y:"", z:""};
        else if(this.getTransformMode.value === "translate"){
            this.currentSelectedTransformValues.value = this.selected.position;
        }else if(this.getTransformMode.value === "rotate"){
            this.currentSelectedTransformValues.value = this.selected.rotation;
        }else if(this.getTransformMode.value === "scale"){
            this.currentSelectedTransformValues.value = this.selected.scale;
        }
    }
    
    #updateSelectedMaterialValues() {
        console.log(this.selected);
        
        if(this.selected.type == "Mesh") {
            this.currentSelectedMaterialValues.value = {
                metalness:this.selected.material.metalness,
                roughness:this.selected.material.roughness,
                opacity:this.selected.material.opacity,
                emissiveIntensity:this.selected.material.emissiveIntensity,
                color:this.selected.material.color,
                emissive:this.selected.material.emissive
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
}

