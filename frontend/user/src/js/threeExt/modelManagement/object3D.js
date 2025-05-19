import {ModelLoader} from "@/js/threeExt/modelManagement/modelLoader.js";
import {Scene} from "three";
import * as THREE from "three";
import {getResource} from "@/js/endpoints.js";

export class Object3D {
    sourceUrl;
    animations
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

    hasAnimations() {
        return (this.animations && this.animations.length !== 0);
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

            this.animations = mesh.animations
            this.object = mesh.scene;
            this.object.animations = this.animations

        }catch(error){
            console.error(error);
            this.object = new Scene();
            this.#error = true;
        }
    }
}
