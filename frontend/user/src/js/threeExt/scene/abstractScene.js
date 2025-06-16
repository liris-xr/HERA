import * as THREE from "three";
import {ImplementationError} from "@/js/utils/implementationError.js";
import {computed} from "vue";
import {RenderLoopInterface} from "@/js/threeExt/interfaces/RenderLoopInterface.js";
import {classes} from "@/js/utils/extender.js";

export class AbstractScene extends classes(THREE.Scene, RenderLoopInterface){
    constructor(){
        super();
    }

    async init() {
        throw new ImplementationError("init");
    }

    getErrors = computed(()=>{
        throw new ImplementationError("getErrors");
    })

    hasDescription(){
        throw new ImplementationError("hasDescription");
    }

    hasLabels = computed(()=>{
        throw new ImplementationError("hasLabels");
    })

    hasAnimation = computed(()=>{
        throw new ImplementationError("hasAnimation");
    })

    resetLabels(){
        throw new ImplementationError("resetLabels");
    }

    resetTriggers(){
        throw new ImplementationError("resetTriggers");
    }

    findAssetById(id){
        throw new ImplementationError("findAssetById");
    }
}
