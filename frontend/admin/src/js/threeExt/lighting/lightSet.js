import * as THREE from "three";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import {classes} from "@/js/utils/extender.js"
import { LightProbeVolume } from "./lightProbeVolume";

export class LightSet extends classes(THREE.Group,SceneElementInterface) {

    #directionalLight
    constructor(shadowMapSize,scene) {
        super();

        const ambientLight = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );

        this.#directionalLight = new THREE.DirectionalLight( 0xffffff, 8 );
        this.setLightPosition(2,2,2)
        this.#directionalLight.castShadow = true;
        this.#directionalLight.shadow.mapSize.width = shadowMapSize;
        this.#directionalLight.shadow.mapSize.height = shadowMapSize;
        this.#directionalLight.shadow.normalBias = 0.01;

        this.add(ambientLight);
        this.add(this.#directionalLight);

        const lightProbeVolume = new LightProbeVolume(new THREE.Vector3(0,1.2,0),10,3,3,3,scene);
        lightProbeVolume.bake(1,256);
    }
    
    pushToScene(scene){
        scene.add(this);
    }

    setLightPosition(x, y, z) {
        this.#directionalLight.position.set(x, y, z);

        const shadowSize = Math.max(x,y,z);

        this.#directionalLight.shadow.camera.left = -shadowSize;
        this.#directionalLight.shadow.camera.right = shadowSize;
        this.#directionalLight.shadow.camera.top = shadowSize;
        this.#directionalLight.shadow.camera.bottom = -shadowSize;
        this.#directionalLight.shadow.camera.near = 0.5;
        this.#directionalLight.shadow.camera.far = 500;
        this.#directionalLight.shadow.camera.updateProjectionMatrix();
    }
}
