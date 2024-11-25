import * as THREE from 'three';
import {PCFSoftShadowMap} from "three";
import {DomElementInterface} from "@/js/threeExt/interfaces/domElementInterface.js";
import {classes} from "@/js/utils/extender.js";

export class ArRenderer extends classes(THREE.WebGLRenderer, DomElementInterface) {
    scaling;
    #domWidth
    #domHeight

    constructor(shadowMapSize, scaling = 1) {
        super([{ antialias: true, alpha: true }]);
        this.scaling = scaling;

        this.setPixelRatio( window.devicePixelRatio );
        this.setDomSize(window.innerWidth, window.innerHeight);
        this.xr.enabled = true;
        this.shadowMap.enabled = true;
        this.shadowMap.type = PCFSoftShadowMap;
        this.shadowMap.width = shadowMapSize;
        this.shadowMap.height = shadowMapSize;
    }


    setDomSize(width, height) {
        this.#domWidth = width;
        this.#domHeight = height;
        this.updateSize()
    }



    updateSize(){
        this.setSize(this.#domWidth, this.#domHeight);
        this.setSize(this.#domWidth*this.scaling, this.#domHeight*this.scaling, false);
    }
}
