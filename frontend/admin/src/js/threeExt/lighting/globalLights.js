import * as THREE from "three";
import * as POSTPROCESSING from "postprocessing"
import { SSGIEffect, VelocityDepthNormalPass } from "realism-effects"


export class GlobalLights {
    composer;

    constructor(scene, camera, renderer) {
        this.composer = new POSTPROCESSING.EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType })

        const velocityDepthNormalPass = new VelocityDepthNormalPass(scene, camera)
        this.composer.addPass(velocityDepthNormalPass)

        // SSGI
        const ssgiEffect = new SSGIEffect(scene, camera, velocityDepthNormalPass)

        const effectPass = new POSTPROCESSING.EffectPass(camera, ssgiEffect)
        this.composer.multisampling = 4
        this.composer.addPass(effectPass)
    }

}
