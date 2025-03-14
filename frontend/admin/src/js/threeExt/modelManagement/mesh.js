import * as THREE from "three";
import {ModelLoader} from "@/js/threeExt/modelManagement/modelLoader.js";
import {getResource} from "@/js/endpoints.js";
import {computed, ref} from "vue";
import {LoadableInterface} from "@/js/threeExt/interfaces/loadableInterface.js";

export class Mesh extends LoadableInterface {
    data;

    #hasError
    #isLoading
    
    constructor(data) {
        super();
        this.data = data
        this.#hasError = ref(false)
        this.#isLoading = ref(false)
    }

    hasError = computed(()=>{
        return this.#hasError.value;
    })

    isLoading = computed( ()=>{
        return this.#isLoading.value;
    })

    load() {
        const loader = ModelLoader.getInstance();

        const onLoad = (mesh) => {
            child.position = this.data.position
            child.rotation = this.data.rotation
            child.scale = this.data.scale

            child.material.roughness = this.data.roughness
            child.material.metalness = this.data.metalness
            child.material.emissiveIntensity = this.data.emissiveIntensity
            child.material.emissive = this.data.emissive
            child.material.opacity = this.data.opacity

            child.castShadow = true;
            child.receiveShadow = true;

            this.#isLoading.value = false;
        }

        const onError = (error) => {
            console.error(error);
            this.#hasError.value = true;
            this.#isLoading.value = false;
        }

        return new Promise((resolve,reject) =>  {
            
        })
    }

}