import * as POSTPROCESSING from "postprocessing"
import { SSGIEffect, VelocityDepthNormalPass } from "realism-effects"


export class GlobalLights {
    constructor(scene, camera, renderer) {
        const composer = new POSTPROCESSING.EffectComposer(renderer)

        const velocityDepthNormalPass = new VelocityDepthNormalPass(scene, camera)
        composer.addPass(velocityDepthNormalPass)

        // SSGI
        const ssgiEffect = new SSGIEffect(scene, camera, velocityDepthNormalPass)

        const effectPass = new POSTPROCESSING.EffectPass(camera, ssgiEffect)

        composer.addPass(effectPass)
    }

}
