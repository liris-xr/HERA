import * as THREE from "three";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import {classes} from "@/js/utils/extender.js";

export class ShadowPlane extends classes(THREE.Group, SceneElementInterface){

    constructor(boundingBox = null, scale = 4) {
        super();
        let width = 4;
        let height = 4;
        let center = new THREE.Vector3();
        if(boundingBox != null && !isNaN(boundingBox.min.x) && isFinite(boundingBox.min.x)){
            width = scale*(boundingBox.max.x-boundingBox.min.x);
            height = scale*(boundingBox.max.z-boundingBox.min.z);
            boundingBox.getCenter(center);
        }
        
        // Safety check for NaN or infinite values
        if (isNaN(width) || !isFinite(width) || width <= 0) width = 1;
        if (isNaN(height) || !isFinite(height) || height <= 0) height = 1;
        const geometry = new THREE.PlaneGeometry(width, height).rotateX( -Math.PI / 2 );
        const shadowMaterial = new THREE.ShadowMaterial({opacity:0.3});
        const occlusionMaterial = new THREE.MeshBasicMaterial({colorWrite: false});

        let occlusionPlane = new THREE.Mesh(geometry.clone(),occlusionMaterial);
        let shadowPlane = new THREE.Mesh(geometry.clone(),shadowMaterial);

        occlusionPlane.renderOrder = -1;
        occlusionPlane.position.set(center.x, 0, center.z);

        shadowPlane.position.set(center.x, 0, center.z);
        shadowPlane.receiveShadow = true;

        // occlusionPlane.visible = false;
        // shadowPlane.visible = false;

        this.add(occlusionPlane);
        this.add(shadowPlane);
    }
    pushToScene(scene){
        scene.add(this);
    }
}
