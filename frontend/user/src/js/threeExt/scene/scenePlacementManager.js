import * as THREE from "three";
import { ObjectManager } from "@/js/threeExt/modelManagement/objectManager.js";
import { computed, ref } from "vue";
import { ArMeshLoadError } from "@/js/threeExt/error/arMeshLoadError.js";
import { ShadowPlane } from "@/js/threeExt/lighting/shadowPlane.js";
import { ToggleableInterface } from "@/js/threeExt/interfaces/ToggleableInterface.js";
import { classes } from "@/js/utils/extender.js";
import { AbstractScene } from "@/js/threeExt/scene/abstractScene.js";
import { extractYawQuaternion } from "@/js/utils/extractYawQuaternion.js";


function ensurePlacementDebugOverlay() {
    let el = document.getElementById("placement-debug-overlay");

    if (!el) {
        el = document.createElement("div");
        el.id = "placement-debug-overlay";
        el.style.position = "fixed";
        el.style.top = "120px";
        el.style.left = "12px";
        el.style.zIndex = "99999";
        el.style.padding = "10px 12px";
        el.style.borderRadius = "10px";
        el.style.fontFamily = "monospace";
        el.style.fontSize = "14px";
        el.style.lineHeight = "1.4";
        el.style.color = "white";
        el.style.background = "rgba(0,0,0,0.8)";
        el.style.pointerEvents = "none";
        el.style.whiteSpace = "pre-line";
        document.body.appendChild(el);
    }

    return el;
}

export class ScenePlacementManager extends classes(AbstractScene, ToggleableInterface) {
    pointerObject;
    #pointerUrl;
    hitTestSource;

    #shadowPlane;
    #foundPlane;
    #isEnabled;

    #errors;

    constructor() {
        super();
        this.#foundPlane = ref(false);
        this.#isEnabled = ref(false);
        this.#errors = [];
        this.#pointerUrl = "public/common/cursor.glb";
    }

    async init() {
        const manager = ObjectManager.getInstance();
        const object = await manager.load(this.#pointerUrl);

        if (object.hasError()) this.#errors.push(new ArMeshLoadError(this.#pointerUrl));

        this.pointerObject = object.object;
        this.pointerObject.castShadow = true;
        this.pointerObject.visible = false;
        this.pointerObject.matrixAutoUpdate = false;

        this.add(this.pointerObject);

        // IMPORTANT: s'assurer que les matrices monde sont à jour avant setFromObject
        this.pointerObject.updateMatrixWorld(true);

        const boundingBox = new THREE.Box3().setFromObject(this.pointerObject);

        // Guard: si la bbox est vide (Infinity/-Infinity), ne pas l'utiliser
        if (boundingBox.isEmpty()) {
            this.#shadowPlane = new ShadowPlane(null);
        } else {
            this.#shadowPlane = new ShadowPlane(boundingBox);
        }

        this.#shadowPlane.pushToScene(this);
    }

    hasDescription() {
        return false;
    }

    hasLabels = computed(() => false);

    hasAnimation = computed(() => false);

    resetLabels() {}

    enable() {
        this.#isEnabled.value = true;
    }

    disable() {
        this.#isEnabled.value = false;
        this.pointerObject.visible = false;
        this.#shadowPlane.visible = false;
    }

    reset(reenable = true) {
        this.pointerObject.position.set(0, 0, 0);
        this.pointerObject.rotation.set(0, 0, 0);
        this.pointerObject.updateMatrix();

        this.#foundPlane.value = false;
        this.pointerObject.visible = false;

        if (reenable) this.enable();
    }

    isEnabled = computed(() => this.#isEnabled.value);

    getWorldTransformMatrix() {
        return this.pointerObject.matrix;
    }

    getErrors = computed(() => this.#errors);

    pushToScene(scene) {
        scene.add(this.pointerObject);
        this.#shadowPlane.pushToScene(scene);
    }

    isStabilized = computed(() => this.#foundPlane.value);

    onXrFrame(time, frame, localReferenceSpace, worldTransformMatrix, camera) {
        if (!this.isEnabled.value) return;
        if (!this.hitTestSource) return;

        const hitTestResults = frame.getHitTestResults(this.hitTestSource);

        if (hitTestResults.length > 0) {
            this.pointerObject.visible = true;

            const hitPose = hitTestResults[0].getPose(localReferenceSpace);
            if (!hitPose) return;

            // position du hit
            const position = new THREE.Vector3(
                hitPose.transform.position.x,
                hitPose.transform.position.y,
                hitPose.transform.position.z
            );

            // Guard: si le pose est invalide, on stop
            if (![position.x, position.y, position.z].every(Number.isFinite)) {
                this.#foundPlane.value = false;
                this.pointerObject.visible = false;
                this.#shadowPlane.visible = false;
                return;
            }

            // direction horizontale (yaw) recalculée
            //const unit = new THREE.Vector3().subVectors(position, camera.position);
            const cameraWorldPos = new THREE.Vector3();
            camera.getWorldPosition(cameraWorldPos);
            const unit = new THREE.Vector3().subVectors(position, cameraWorldPos);
            // Guard: éviter normalize() sur un vecteur quasi nul
            if (unit.lengthSq() < 1e-12) {
                this.#foundPlane.value = false;
                this.pointerObject.visible = false;
                this.#shadowPlane.visible = false;
                return;
            }

            unit.normalize();

            const direction = extractYawQuaternion(
                new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), unit)
            );

            // Guard quaternion
            if (![direction.x, direction.y, direction.z, direction.w].every(Number.isFinite)) {
                this.#foundPlane.value = false;
                this.pointerObject.visible = false;
                this.#shadowPlane.visible = false;
                return;
            }

            const matrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);

            const scale = new THREE.Vector3();
            const tmpQ = new THREE.Quaternion();

            matrix.decompose(position, tmpQ, scale);

            // Guard scale
            if (![scale.x, scale.y, scale.z].every(Number.isFinite)) {
                this.#foundPlane.value = false;
                this.pointerObject.visible = false;
                this.#shadowPlane.visible = false;
                return;
            }

            matrix.compose(position, direction, scale);
            //debugging
            /*const overlay = ensurePlacementDebugOverlay();
            overlay.innerHTML = [
                `hitY: ${position.y.toFixed(3)}`,
                `scaleY: ${scale.y.toFixed(3)}`,
                `foundPlane: ${this.#foundPlane.value}`,
            ].join("<br>");*/

            this.pointerObject.matrix.copy(matrix);
            this.pointerObject.updateWorldMatrix(true);

            this.#shadowPlane.visible = true;

            this.#shadowPlane.matrixAutoUpdate = false;
            this.#shadowPlane.matrix.copy(matrix);

            // Note: applyQuaternion modifie l'orientation du groupe
            this.#shadowPlane.applyQuaternion(direction);
            this.#shadowPlane.updateWorldMatrix(true);

            this.#foundPlane.value = true;
        } else {
            this.#foundPlane.value = false;
            this.pointerObject.visible = false;
            this.#shadowPlane.visible = false;
        }
    }
}