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
import {EXRLoader} from "three/addons";
import {getResource} from "@/js/endpoints.js";

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
    meshMap;
    #errors;
    #gridPlane;
    #lightSet;
    #transformControls;
    
    selected;
    onChanged;
    #meshSelectionMode
    #currentTransformMode;
    currentSelectedTransformValues;
    currentSelectedMaterialValues;
    
    currentMeshes;
    currentMeshGroup;
    transformBeforeChange;

    constructor(shadowMapSize) {
        super();
        this.labelManager = new LabelManager();
        this.assetManager = new AssetManager();
        this.meshMap = new Map();
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

            if(this.selected instanceof Asset) {

                if(this.getTransformMode.value === "translate"){
                    this.selected.value.getObject().position.set(value.value.x, value.value.y, value.value.z);
                }else if(this.getTransformMode.value === "rotate"){
                    this.selected.value.getObject().rotation.set(value.value.x, value.value.y, value.value.z);
                }else if(this.getTransformMode.value === "scale"){
                    this.selected.value.getObject().scale.set(value.value.x, value.value.y, value.value.z);
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

        this.#gridPlane = new GridPlane();
        this.#gridPlane.pushToScene(this);
        this.assetManager.onMoved = ()=>{this.updatePlaygroundSize()};

        if(sceneData.envmapUrl)
            this.environment = new EXRLoader()
                .load(getResource(sceneData.envmapUrl), (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping

                    // this.background = texture
                })
    }

    setupControls(controls){
        this.#transformControls = controls;
        this.add(this.#transformControls);
        this.setTransformMode("translate");

            
        this.#transformControls.addEventListener('objectChange', () => {
            this.#updateSelectedTransformValues();
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

        }

        this.setSelected(object);

    }
    setSelected(object, selected = true){
        this.deselectAll();
        this.selected.value = object;
        console.log(object)
        if(object==null || selected === false){
            this.#transformControls.detach();
        } else {

            if(this.#meshSelectionMode.value) {
                if(object.isMesh) {
                    this.attachMeshes(object)
                } else if(object.label) {
                    this.#transformControls.attach(object.getObject());
                } else if(object.subMeshes) { // Object is an asset
                    this.attachMeshes(object.subMeshes[0])
                }
            } else {
                this.#transformControls.attach(object.getObject())
                object.setSelected(selected)
            }

        }
        this.#updateSelectedTransformValues();
        this.#updateSelectedMaterialValues();
    }

    // Attach every mesh related to the object to a group
    attachMeshes(object) {
        this.#transformControls.attach(object)
        return

        const selectedMeshKey = "project-"+this.projectId+"-scene-"+this.sceneTitle+"-mesh-"+object.name

        const currentMeshData = this.meshMap.get(selectedMeshKey)
        this.currentMeshes = this.assetManager.meshManagerMap.get(currentMeshData.assetId).getMeshes.value
        
        // We need to group up our meshes so we can move all of them
        let meanPos = new THREE.Vector3(0,0,0);
        
        const weight = 1/this.currentMeshes.length
        this.currentMeshGroup = new THREE.Group()
        for (let mesh of this.currentMeshes) {
            this.currentMeshGroup.add(mesh)
            meanPos.addScaledVector(mesh.position,weight);
        }
        this.#transformControls.position.copy(meanPos)
        
        this.add(this.currentMeshGroup)
        
        this.#transformControls.attach(this.currentMeshGroup)
    }

    getSelected() {
        return this.selected.value;
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
        console.log(newAsset)

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

        if(this.selected.value instanceof Asset) {

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
}

