import {computed, shallowReactive} from "vue";
import {Asset} from "@/js/threeExt/modelManagement/asset.js";
import {MeshManager} from "@/js/threeExt/modelManagement/meshManager.js";
import {MeshLoadError} from "@/js/threeExt/error/meshLoadError.js";
import * as THREE from "three";
import {Vector3} from "three";
import { subclip } from "three/src/animation/AnimationUtils";

let currentAssetId = 0;
export class AssetManager {
    #assets;
    sceneTitle;
    projectId;
    meshManagerMap;
    meshDataMap; // Data (tranforms, materials) coming from the database
    onChanged;
    onMoved;

    constructor() {
        this.#assets = shallowReactive([]);
        this.meshManagerMap = new Map();
    }

    setProjectId(id) {
        this.projectId = id;
    }

    setSceneTitle(title) {
        this.sceneTitle = title
    }

    setMeshMap(meshDataMap) {
        this.meshDataMap = meshDataMap;
    }

    setMeshMapWithData(meshData) {
        meshData.forEach( (mesh) => {
            this.meshDataMap.set(mesh.id,mesh)
        })
    }

    getAssets = computed(()=>{
        return this.#assets;
    });

    getAssetSubMeshes(asset) {
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
        
        step(asset,new THREE.Matrix4())

        return subMeshes
    }

    addToScene(scene,asset,onAdd){
        if(asset.id == null){
            asset.id = 'new-asset'+currentAssetId++;
        }
        
        this.meshManagerMap.set(asset.id,new MeshManager())
        
        asset.load().then((mesh)=>{
            this.getAssetSubMeshes(mesh).forEach( (subMesh) => {
                const subMeshData = this.meshDataMap.get("project-"+this.projectId+"-scene-"+this.sceneTitle+"-mesh-"+subMesh.name)
                if(subMeshData) {
                    subMeshData.assetId = asset.id
                }
                
                this.meshManagerMap.get(asset.id).addSubMesh(scene,subMesh,subMeshData)
                asset.addSubMesh(subMesh);
            })
            
            this.setMeshMapWithData(this.getResultMeshes())
            
            if(onAdd)
                onAdd(asset)
        }).catch(()=>{
            scene.appendError(new MeshLoadError(asset.sourceUrl))
            }
        );
        
        this.#assets.push(asset);
        this.runOnChanged();
        return asset;
    }

    removeFromScene(scene, asset){
        let self = this;
        this.#assets.forEach(function(currentAsset, index, object) {
            if (asset.id === currentAsset.id) {
                object.splice(index, 1);
                self.runOnChanged();
                
                self.meshManagerMap.get(asset.id).clear(scene)
                self.meshManagerMap.delete(asset.id)
                return true
            }
        });
        return false;
    }

    hasAssets = computed(()=>{
        return this.#assets.length>0;
    })

    getResultAssets(){
        const result = []
        for (let asset of this.#assets) {
            result.push({
                id: asset.id,
                name:asset.name,
                position:asset.getResultPosition(),
                rotation: asset.getResultRotation(),
                scale: asset.getResultScale(),
                hideInViewer: asset.hideInViewer.value,
                copiedUrl: asset?.copiedUrl,
                activeAnimation: asset.activeAnimation
            });
        }
        
        return result;
    }

    getResultMeshes() {
        let result = []
        
        this.meshManagerMap.forEach( (meshManager,assetId) => {
            for (let mesh of meshManager.getMeshes.value) {
                result.push({
                    id:"project-"+this.projectId+"-scene-"+this.sceneTitle+"-mesh-"+mesh.name,
                    position:mesh.position,
                    rotation:mesh.rotation,
                    scale: mesh.scale,
                    assetId:assetId,
                    name: mesh.name,
                    color:{
                        r:mesh.material.color.r,
                        g:mesh.material.color.g,
                        b:mesh.material.color.b,
                    },
                    emissive:{
                        r:mesh.material.emissive.r,
                        g:mesh.material.emissive.g,
                        b:mesh.material.emissive.b,
                    },
                    emissiveIntensity: mesh.material.emissiveIntensity,
                    roughenss: mesh.material.roughness,
                    metalness: mesh.material.metalness,
                    opacity: mesh.material.opacity
                })
            }
        })
        
        return result;
    }

    getResultUploads(){
        const uploads = []
        for (let asset of this.#assets) {
            if(asset.uploadData != null)
                uploads.push(asset.uploadData);
        }
        return uploads;
    }

    setUploaded(assets, idsMatching){

        for (let id of idsMatching) {
            for (let asset of this.#assets) {
                if(asset.id == id.tempId){
                    asset.id = id.newId
                }
            }
        }

        for (let i = 0; i < assets.length; i++) {
            for (let j = 0; j<this.#assets.length; j++) {
                if(assets[i].id == this.#assets[j].id){
                    this.#assets[j].setUploadedAtUrl(assets[i].url);
                }
            }
        }
    }

    runOnChanged(){
        if(this.onChanged)
            this.onChanged();
        if(this.onMoved)
            this.onMoved();
    }


    getSceneBoundingBox(){
        const boundingGroup = []
        
        this.meshManagerMap.forEach( (meshManager) => {
            for (let mesh of meshManager.getMeshes.value) {
                const meshBoundingBox = new THREE.Box3().setFromObject(mesh);
                boundingGroup.push(meshBoundingBox);
            }
        })
        
        let vMin = new Vector3(0,0,0);
        let vMax = new Vector3(0,0,0);
        for (let boundingBox of boundingGroup) {
            vMin.min(boundingBox.min);
            vMax.max(boundingBox.max);
        }
        return new THREE.Box3(vMin,vMax)
    }
}
