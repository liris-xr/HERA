import * as THREE from "three";
import {ModelLoader} from "@/js/threeExt/modelManagement/modelLoader.js";
import {getResource} from "@/js/endpoints.js";
import {computed, ref} from "vue";
import {LoadableInterface} from "@/js/threeExt/interfaces/loadableInterface.js";

export class Mesh extends LoadableInterface {
    sourceUrl;
    rawData;

    #hasError
    #isLoading

    constructor(sourceUrl, rawData = null) {
        super();
        this.sourceUrl = sourceUrl;
        this.rawData = rawData
        this.#hasError = ref(false)
        this.#isLoading = ref(false)
    }

    hasError = computed(()=>{
        return this.#hasError.value;
    })

    isLoading = computed( ()=>{
        return this.#isLoading.value;
    })

    load(){
        const loader = ModelLoader.getInstance();

        const onLoad = (mesh) => {
            mesh.scene.animations = mesh.animations
            mesh.scene.traverse( function(child) {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            this.#isLoading.value = false;
        };

        const onError = (error) => {
            console.error(error);
            this.#hasError.value = true;
            this.#isLoading.value = false;
        }


        if(this.rawData == null)
            return new Promise((resolve, reject) => {
                loader.load(getResource(this.sourceUrl),
                    (mesh)=> {
                        onLoad(mesh)
                        resolve(mesh.scene);
                    },
                    ()=> {
                        this.#isLoading.value = true;
                    },
                    (error) =>
                    {
                        onError(error)
                        reject(null);
                    }
                );
            });
        else
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const contents = event.target.result;
                    this.#isLoading.value = true;
                    loader.parse(
                        contents,
                        '',
                        (mesh) => {
                            onLoad(mesh)
                            resolve(mesh.scene);
                        },
                        (error) => {
                            onError(error)
                            reject(null);
                        })

                };
                reader.readAsArrayBuffer(this.rawData);
            })

    }
}
