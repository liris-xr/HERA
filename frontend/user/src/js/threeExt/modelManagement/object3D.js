import {ModelLoader} from "@/js/threeExt/modelManagement/modelLoader.js";
import {Scene} from "three";
import * as THREE from "three";
import {getResource} from "@/js/endpoints.js";

export class Object3D {
    sourceUrl;
    object

    #error

    constructor(sourceUrl) {
        this.sourceUrl = sourceUrl;
        this.#error = false
        this.object = null;
    }

    hasError(){
        return this.#error;
    }

    async load(){
        const loader = ModelLoader.getInstance();
        try {
            const object = await loader.loadAsync(getResource(this.sourceUrl));

            object.scene.traverse( function(child) {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.object = object.scene;

        }catch(error){
            console.error(error);
            this.object = new Scene();
            this.#error = true;
        }
    }
}
