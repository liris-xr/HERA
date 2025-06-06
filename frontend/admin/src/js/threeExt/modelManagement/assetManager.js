import {computed, shallowReactive} from "vue";
import {Asset} from "@/js/threeExt/modelManagement/asset.js";
import {MeshLoadError} from "@/js/threeExt/error/meshLoadError.js";
import * as THREE from "three";
import {Vector3} from "three";

let currentAssetId = 0;
export class AssetManager {
    #assets;
    onChanged;
    onMoved;

    constructor() {
        this.#assets = shallowReactive([]);
    }

    getAssets = computed(()=>{
        return this.#assets;
    });


    addToScene(scene,asset,onAdd){
        if(asset.id == null){
            asset.id = 'new-asset'+currentAssetId;
            currentAssetId++;
        }

        asset.load().then((mesh)=>{
            scene.add(mesh)
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
