import * as THREE from 'three';
import {DomElementInterface} from "@/js/threeExt/interfaces/domElementInterface.js";
import {classes} from "@/js/utils/extender.js";

export class EditorCamera extends classes(THREE.PerspectiveCamera, DomElementInterface) {
    #domWidth;
    #domHeight;
    constructor() {
        super( [70, window.innerWidth / window.innerHeight, 0.01, 200] );
        this.setDomSize(window.innerWidth, window.innerHeight);
    }

    setDomSize(width, height){
        this.#domWidth = width;
        this.#domHeight = height;
        this.updateSize()
    }

    updateSize(){
        this.aspect = this.#domWidth / this.#domHeight;
        this.updateProjectionMatrix();
    }
}
