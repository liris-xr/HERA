import * as THREE from "three";

/**
 * This class allows you to light the scene according to a real ambient light estimation.
 * However, the feature has been replaced by constant lighting due to inconsistent estimation.
 *
 * Light estimation can still be used by replacing LightSet (in ArSceneManager) by an instance of LightingEstimation
 * In that case, onXrFrame function must be called on each frame to update the estimation
 */

export class LightingEstimation {
    threeDirectionalLight;
    threeLightProbe;

    constructor() {
        this.threeDirectionalLight = new THREE.DirectionalLight();
        this.threeLightProbe = new THREE.LightProbe();

        this.threeDirectionalLight.castShadow = true;
    }



    pushToScene(scene){
        scene.add(this.threeDirectionalLight);
        scene.add(this.threeLightProbe);
    }

    onXrFrame(time, frame, lightProbe){
        let lightEstimate = frame.getLightEstimate(lightProbe);

        let intensity = Math.max(1.0,
            Math.max(lightEstimate.primaryLightIntensity.x,
                Math.max(lightEstimate.primaryLightIntensity.y,
                    lightEstimate.primaryLightIntensity.z)));

        this.threeDirectionalLight.position.set(lightEstimate.primaryLightDirection.x,
            lightEstimate.primaryLightDirection.y,
            lightEstimate.primaryLightDirection.z);
        this.threeDirectionalLight.color.setRGB(lightEstimate.primaryLightIntensity.x / intensity,
            lightEstimate.primaryLightIntensity.y / intensity,
            lightEstimate.primaryLightIntensity.z / intensity);
        this.threeDirectionalLight.intensity = intensity;

        this.threeLightProbe.sh.fromArray(lightEstimate.sphericalHarmonicsCoefficients);

    }
}
