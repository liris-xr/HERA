import * as THREE from "three";
import {Asset} from "@/js/threeExt/modelManagement/asset.js";
import {computed} from "vue";
import {ArMeshLoadError} from "@/js/threeExt/error/arMeshLoadError.js";
import {ShadowPlane} from "@/js/threeExt/lighting/shadowPlane.js";
import {AbstractScene} from "@/js/threeExt/scene/abstractScene.js";
import {LabelPlayer} from "@/js/threeExt/postProcessing/labelPlayer.js";
import {Vector3} from "three";
import {EmptyAsset} from "@/js/threeExt/modelManagement/emptyAsset.js";
import { MeshManager } from "../modelManagement/meshManager";

export class ArScene extends AbstractScene {
    sceneId
    title;
    description;
    #assets
    meshDataMap // Mesh data from the database
    labelPlayer;
    #shadowPlane
    #errors;
    #boundingSphere
    #boundingBox;

    constructor(sceneData) {
        super();
        this.sceneId = sceneData.id;
        this.title = sceneData.title;
        this.description = sceneData.description;
        this.#assets = [];
        this.meshDataMap = new Map();
        this.meshManager = new MeshManager()
        
        for (let assetData of sceneData.assets) {
            this.#assets.push(new Asset(assetData));
        }
        
        for (let meshData of sceneData.meshes) {
            this.meshDataMap.set(meshData.name,meshData)
        }

        if(this.#assets.length == 0) this.#assets.push(new EmptyAsset())

        this.labelPlayer = new LabelPlayer();
        for (let labelData of sceneData.labels) {
            this.labelPlayer.addToScene(this,labelData);
        }

        this.#errors = [];
        this.#boundingSphere = null;
        this.#boundingBox = null;
    }

    getAssetSubMeshes(assetData) {
        let subMeshes = []
        
        const step = (child,transform) => {
            for(let children of child.children) {
                if ("material" in children) {
                    children.applyMatrix4(transform)
                    subMeshes.push(children)
                } else {
                    let newTransform = new THREE.Matrix4()
                    step(children,newTransform.multiplyMatrices(transform,children.matrix))
                }
                
            }
        }
        if(assetData.object) {
            step(assetData.object,new THREE.Matrix4())
        } else {
            subMeshes.push(assetData.mesh)
        }

        return subMeshes
    }

    async init(){
        for (let assetData of this.#assets) {
            await assetData.load();
            if(assetData.hasError()){
                this.#errors.push(new ArMeshLoadError(assetData.sourceUrl));
            }
            
            this.getAssetSubMeshes(assetData).forEach( (subMesh) => {
                const subMeshData = this.meshDataMap.get(subMesh.name)
                
                this.meshManager.addSubMesh(this,subMesh,subMeshData)
            })
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
            for (let mesh of this.meshManager.getMeshes.value) {
                group.add(mesh.clone());
            }
            this.#boundingBox = new THREE.Box3().setFromObject(group);
        }
        return this.#boundingBox
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

        this.labelPlayer.onXrFrame(time, frame, localReferenceSpace, worldTransformMatrix, cameraPosition);
    }
}
