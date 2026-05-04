import * as THREE from "three";
import { DomElementInterface } from "@/js/threeExt/interfaces/domElementInterface.js";
import { classes } from "@/js/utils/extender.js";

export class ArCamera extends classes(THREE.PerspectiveCamera, DomElementInterface) {
    #domWidth;
    #domHeight;

    constructor() {
        super([70, window.innerWidth / window.innerHeight, 0.01, 500]);

        this.position.set(0, 1.5, 4);
        this.setDomSize(window.innerWidth, window.innerHeight);
    }

    setDomSize(width, height) {
        this.#domWidth = Math.max(width, 1);
        this.#domHeight = Math.max(height, 1);
        this.updateSize();
    }

    updateSize() {
        this.aspect = this.#domWidth / this.#domHeight;
        this.updateProjectionMatrix();
    }
}