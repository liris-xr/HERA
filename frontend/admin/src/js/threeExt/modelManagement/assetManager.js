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
    meshManager;
    meshData;
    onChanged;
    onMoved;

    constructor(meshManager) {
        this.#assets = shallowReactive([]);
        this.meshManager = meshManager;
    }

    setMeshData(meshData) {
        this.meshData = meshData;
    }

    getAssets = computed(()=>{
        return this.#assets;
    });

    getAssetSubMeshes(asset) {
        let subMeshes = []
        asset.traverse( function(child) {
            if ("material" in child) {
               subMeshes.push(child)
            }
        });
        
        return subMeshes
    }


    addToScene(scene,asset,onAdd){
        if(asset.id == null){
            asset.id = 'new-asset'+currentAssetId;
            currentAssetId++;
        }
        
        asset.load().then((mesh)=>{
            
            this.getAssetSubMeshes(mesh).forEach( (subMesh) => {
                const subMeshData = this.meshData.get("mesh-"+subMesh.id+'-'+subMesh.name)
                
                this.meshManager.addSubMesh(scene,subMesh,subMeshData,onAdd)
                
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
                scene.remove(asset.getObject());
                self.runOnChanged();
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
        // Tricky part : 
        // We need to find the meshes in the asset
        // But they are sorted in diffrents ways depending on the asset
        // We have to go down the tree until we found the meshes

        let result = []
        for (let mesh of this.meshManager.getMeshes.value) {
            result.push({
                id:"mesh-"+mesh.id+'-'+mesh.name,
                position:mesh.position,
                rotation:mesh.rotation,
                scale: mesh.scale,
                assetId:1,
                name: mesh.name,
                color:mesh.material.color,
                emissiveIntensity: mesh.material.emissiveIntensity,
                emissiveColor: mesh.material.emissiveColor,
                roughenss: mesh.material.roughness,
                metalness: mesh.material.metalness,
                opacity: mesh.material.opacity
            })
        }
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
        for (let asset of this.#assets) {
            const assetBoundingBox = new THREE.Box3().setFromObject(asset.getObject());
            boundingGroup.push(assetBoundingBox);
        }

        let vMin = new Vector3(0,0,0);
        let vMax = new Vector3(0,0,0);
        for (let boundingBox of boundingGroup) {
            vMin.min(boundingBox.min);
            vMax.max(boundingBox.max);
        }
        return new THREE.Box3(vMin,vMax)
    }
}
