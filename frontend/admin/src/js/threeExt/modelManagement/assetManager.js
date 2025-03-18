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
    meshManagerMap;
    meshData;
    onChanged;
    onMoved;

    constructor() {
        this.#assets = shallowReactive([]);
        this.meshManagerMap = new Map();
    }

    setMeshData(meshData) {
        this.meshData = meshData;
    }

    getAssets = computed(()=>{
        return this.#assets;
    });

    initAssetSubMeshes(asset) {
        const step = (child,transform) => {
            for(let children of child.children) {
                if ("material" in children) {
                    children.applyMatrix4(transform)
                } else {
                    let newTransform = new THREE.Matrix4
                    step(children,newTransform.multiplyMatrices(transform,children.matrix))
                }
                
            }
        }
        
        step(asset,new THREE.Matrix4)
    }

    getAssetSubMeshes(asset) {
        let subMeshes = []
        
        const step = (child) => {
            for(let children of child.children) {
                if ("material" in children) {
                    subMeshes.push(children)
                } else {
                    step(children)
                }
                
            }
        }
        
        step(asset)
        
        return subMeshes
    }


    addToScene(scene,asset,onAdd){
        if(asset.id == null){
            asset.id = 'new-asset'+currentAssetId;
            currentAssetId++;
        }
        this.meshManagerMap.set(asset.id,new MeshManager())
        
        asset.load().then((mesh)=>{
            this.initAssetSubMeshes(mesh);
            
            this.getAssetSubMeshes(mesh).forEach( (subMesh) => {
                const subMeshData = this.meshData.get("mesh-"+subMesh.name)
                this.meshManagerMap.get(asset.id).addSubMesh(scene,subMesh,subMeshData)
            })
            
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
                hideInViewer: asset.hideInViewer.value
            });
        }
        
        return result;
    }

    getResultMeshes() {
        // We need to find the meshes in the asset
        // But they are sorted in diffrents ways depending on the asset
        // We have to go down the tree until we found the meshes

        let result = []

        this.meshManagerMap.forEach( (meshManager) => {
            for (let mesh of meshManager.getMeshes.value) {
                result.push({
                    id:"mesh-"+mesh.name,
                    position:mesh.position,
                    rotation:mesh.rotation,
                    scale: mesh.scale,
                    assetId:1,
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
