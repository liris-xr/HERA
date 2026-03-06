import * as THREE from "three";
import { SceneElementInterface } from "@/js/threeExt/interfaces/sceneElementInterface.js";
import { classes } from "@/js/utils/extender.js";

function isFinitePositive(n) {
    return Number.isFinite(n) && n > 0;
}

export class ShadowPlane extends classes(THREE.Group, SceneElementInterface) {
    constructor(boundingBox = null, scale = 4) {
        super();

        let width = 4;
        let height = 4;
        const center = new THREE.Vector3();

        // Guard bbox: éviter Infinity/-Infinity et tailles invalides
        if (boundingBox != null && !boundingBox.isEmpty()) {
            const w = scale * (boundingBox.max.x - boundingBox.min.x);
            const h = scale * (boundingBox.max.z - boundingBox.min.z);

            if (isFinitePositive(w) && isFinitePositive(h)) {
                width = w;
                height = h;
                boundingBox.getCenter(center);
            }
        }

        const geometry = new THREE.PlaneGeometry(width, height).rotateX(-Math.PI / 2);

        const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        const occlusionMaterial = new THREE.MeshBasicMaterial({ colorWrite: false });

        const occlusionPlane = new THREE.Mesh(geometry.clone(), occlusionMaterial);
        const shadowPlane = new THREE.Mesh(geometry.clone(), shadowMaterial);

        occlusionPlane.renderOrder = -1;
        occlusionPlane.position.set(center.x, 0, center.z);

        shadowPlane.position.set(center.x, 0, center.z);
        shadowPlane.receiveShadow = true;

        this.add(occlusionPlane);
        this.add(shadowPlane);
    }

    pushToScene(scene) {
        scene.add(this);
    }
}