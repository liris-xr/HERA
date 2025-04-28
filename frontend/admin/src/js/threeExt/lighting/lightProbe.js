import * as THREE from "three";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import {classes} from "@/js/utils/extender.js"
import { randFloat } from "three/src/math/MathUtils";



export class LightProbe extends classes(THREE.LightProbe) {
    probeId;
    color; //used for debugging purposes

    constructor(id) {
        super();
        this.probeId = id;
        this.color = new THREE.Color(0,0,0); 
    }

    setColor(color) {
        this.color = color;
    }

    addSphereToScene(scene) {
        const geometry = new THREE.SphereGeometry(0.01,30,30) 
        const material = new THREE.MeshBasicMaterial( { color: this.color } ); 
        const sphere = new THREE.Mesh( geometry, material ); 
        sphere.position.copy(this.position)
        scene.add( sphere );
    }

}
