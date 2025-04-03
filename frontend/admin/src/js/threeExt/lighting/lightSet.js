import * as THREE from "three";
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import {classes} from "@/js/utils/extender.js"

export class LightSet extends classes(THREE.Group,SceneElementInterface) {

    #directionalLight
    constructor(shadowMapSize) {
        super();

        const ambientLight = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );

        this.#directionalLight = new THREE.DirectionalLight( 0xffffff, 8 );
        this.setLightPosition(2,2,2)
        this.#directionalLight.castShadow = true;
        this.#directionalLight.shadow.mapSize.width = shadowMapSize;
        this.#directionalLight.shadow.mapSize.height = shadowMapSize;
        this.#directionalLight.shadow.normalBias = 0.01;

        RectAreaLightUniformsLib.init();

        const rectLight = new THREE.RectAreaLight( 0xffffff, 1,  2, 2 );
        rectLight.position.set( 0, 3, 0 );
        // rectLight.lookAt( 0, 0, 0 );
        // this.add( rectLight )

        const rectLightHelper = new RectAreaLightHelper( rectLight );
        // rectLight.add( rectLightHelper );
        // this.add(ambientLight);
        // this.add(this.#directionalLight);

        const pointLight = new THREE.PointLight(0xffffff,100);
        pointLight.position.set(0,3,0);
        // this.add(pointLight)
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
