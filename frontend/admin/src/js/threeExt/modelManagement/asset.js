import {SelectableInterface} from "@/js/threeExt/interfaces/selectableInterface.js";
import {classes} from "@/js/utils/extender.js";
import {computed, ref} from "vue";
import {LoadableInterface} from "@/js/threeExt/interfaces/loadableInterface.js";
import {Mesh} from "@/js/threeExt/modelManagement/mesh.js";
import * as THREE from "three";

export class Asset extends classes(SelectableInterface, LoadableInterface){

    id;
    mesh;
    name;
    hideInViewer;
    sourceUrl;
    uploadData;
    position;
    rotation;
    scale;

    #hasError;
    #isLoading;
    #isSelected;

    animationMixer
    animations
    activeAnimation

    copiedUrl




    constructor(assetData) {
        super();
        this.id = assetData.id;
        this.#isSelected = ref(false);
        this.sourceUrl = assetData.url;
        this.name = assetData.name;
        this.hideInViewer = ref(assetData.hideInViewer);
        this.uploadData = assetData.uploadData || null;
        this.activeAnimation = assetData.activeAnimation || null;
        this.animations = []

        this.mesh = new THREE.Mesh();

        if(assetData.position)
            this.position = assetData.position;
        else
            this.position = {x:0,y:0, z:0};

        if(assetData.rotation)
            this.rotation = assetData.rotation;
        else
            this.rotation = {x:0,y:0, z:0};

        if(assetData.scale)
            this.scale = assetData.scale;
        else
            this.scale = {x:1,y:1, z:1};
        this.#hasError = ref(false);
        this.#isLoading = ref(true);

        if(assetData?.copiedUrl)
            this.copiedUrl = assetData.copiedUrl;
    }

    hasError = computed(()=>{
        return this.#hasError.value;
    })

    isLoading = computed(()=>{
        return this.#isLoading.value;
    })

    switchViewerDisplayStatus(){
        this.hideInViewer.value = !this.hideInViewer.value;
    }

    load(){
        let meshToLoad;
        if(this.uploadData !=null){
            meshToLoad = new Mesh(null, this.uploadData);
        }else{
            meshToLoad = new Mesh(this.sourceUrl, null)
        }

        return new Promise((resolve, reject) => {
            meshToLoad.load().then((mesh)=>{
                this.#isLoading.value = false;
                this.#hasError.value = false;
                mesh.position.set(this.position.x, this.position.y, this.position.z);
                mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
                mesh.scale.set(this.scale.x, this.scale.y, this.scale.z);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.mesh = mesh;
                this.animations = mesh.animations;
                resolve(this.mesh)
            }).catch(()=>{
                    this.#isLoading.value = false;
                    this.#hasError.value = true;
                    reject(null);
                }
            );
        });


    }

    getObject(){
        return this.mesh;
    }

    setSelected(selected){
        this.#isSelected.value = selected;
    }

    setUploadedAtUrl(url){
        this.uploadData = null;
        this.sourceUrl = url;
    }

    isSelected = computed(()=>this.#isSelected.value);


    getResultPosition(){
        const result = {}
        result.x = this.getObject().position.x;
        result.y = this.getObject().position.y;
        result.z = this.getObject().position.z;
        return result;
    }

    getResultRotation(){
        const result = {}
        result.x = this.getObject().rotation.x;
        result.y = this.getObject().rotation.y;
        result.z = this.getObject().rotation.z;
        return result;
    }

    getResultScale(){
        const result = {}
        result.x = this.getObject().scale.x;
        result.y = this.getObject().scale.y;
        result.z = this.getObject().scale.z;
        return result;
    }

    clone() {
        const clonedData = {
            id: crypto.randomUUID(),
            name: this.name,
            url: this.sourceUrl,
            hideInViewer: this.hideInViewer.value,
            uploadData: this.uploadData,
            position: { ...this.position },
            rotation: { ...this.rotation },
            scale: { ...this.scale }
        };

        // penser a load le nouvel asset
        return new Asset(clonedData);
    }



}
