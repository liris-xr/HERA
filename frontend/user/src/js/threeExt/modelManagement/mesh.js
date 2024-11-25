import {ModelLoader} from "@/js/threeExt/modelManagement/modelLoader.js";
import {Scene} from "three";
import * as THREE from "three";
import {getResource} from "@/js/endpoints.js";

export class Mesh{
    sourceUrl;
    mesh

    #error

    constructor(sourceUrl) {
        this.sourceUrl = sourceUrl;
        this.#error = false
        this.mesh = null;
    }

    hasError(){
        return this.#error;
    }

    async load(){
        const loader = ModelLoader.getInstance();
        try {
            const mesh = await loader.loadAsync(getResource(this.sourceUrl));

            mesh.scene.traverse( function(child) {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.mesh = mesh.scene;

        }catch(error){
            console.error(error);
            this.mesh = new Scene();
            this.#error = true;
        }
    }
}
