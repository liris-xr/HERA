import {ModelLoader} from "@/js/threeExt/modelManagement/modelLoader.js";
import {Scene} from "three";
import * as THREE from "three";
import {getResource} from "@/js/endpoints.js";

export class Mesh{
    sourceUrl;
    mesh
    parent
    animations

    #error

    constructor(sourceUrl) {
        this.sourceUrl = sourceUrl;
        this.#error = false
        this.mesh = null;
    }

    hasError(){
        return this.#error;
    }

    test() {
        console.log("salut")
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

            this.parent = mesh;
            this.animations = mesh.animations
            this.mesh = mesh.scene;

        }catch(error){
            console.error(error);
            this.mesh = new Scene();
            this.#error = true;
        }
    }
}
