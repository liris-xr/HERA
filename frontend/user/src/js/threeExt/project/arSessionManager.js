import { ArSceneManager } from "../scene/arSceneManager";
import { ArCamera } from "../lighting/arCamera";
import { ArRenderer } from "../rendering/arRenderer";
import { OrbitControls } from "three/addons";
import { computed, ref } from "vue";
import { LabelRenderer } from "@/js/threeExt/rendering/labelRenderer.js";
import { Xr3dUi } from "@/js/threeExt/ui/Xr3dUi.js";
import * as THREE from "three";
import { extractYawQuaternion } from "@/js/utils/extractYawQuaternion.js";
import { ScenePlacementManager } from "@/js/threeExt/scene/scenePlacementManager.js";
import { buildSimpleDevicePolicy } from "@/js/threeExt/DeviceProfile/devicePolicy.js";

export class ArSessionManager {
    sceneManager;
    arCamera;
    arRenderer;
    labelRenderer;

    shadowMapSize;
    controls;

    #isArRunning;

    xrMode;
    enable3dUI;
    xr3dUi;

    domOverlay;
    domContainer;
    domWidth;
    domHeight;

    constructor(json) {
        this.shadowMapSize = 4096;
        this.domContainer = null;
        this.domWidth = 380;
        this.domHeight = 280;
        this.#isArRunning = ref(false);
        this.enable3dUI = false;

        this.sceneManager = new ArSceneManager(json.scenes, this.shadowMapSize);
        this.arCamera = new ArCamera();

        this.arRenderer = new ArRenderer(this.shadowMapSize, 1);
        this.labelRenderer = new LabelRenderer();

        this.sceneManager.onSceneChanged = function () {
            this.labelRenderer.clear();

            if (this.xr3dUi) {
                this.xr3dUi.addToScene(this.sceneManager.active.value);
            }

            this.applyVrCameraPosition();
            this.#resetCameraPosition();
        }.bind(this);

        this.devicePolicy = null;

        window.addEventListener("resize", this.onWindowResize.bind(this));
    }

    async init(container, arOverlay) {
        this.domContainer = container;

        await this.sceneManager.init();

        container.appendChild(this.arRenderer.domElement);
        arOverlay.firstChild.appendChild(this.labelRenderer.domElement);

        this.controls = new OrbitControls(this.arCamera, this.arRenderer.domElement);

        this.onWindowResize();

        this.devicePolicy = buildSimpleDevicePolicy();
        console.log("device policy", this.devicePolicy);

        for (const scene of this.sceneManager.scenes) {
            if (typeof scene.setDevicePolicy === "function") {
                scene.setDevicePolicy(this.devicePolicy);
            }
        }

        this.domOverlay = arOverlay;
        this.arRenderer.setAnimationLoop(this.onXrFrame.bind(this));
    }

    #resetCameraPosition() {
        const sphere = this.sceneManager.getBoundingSphere();

        if (!sphere || !isFinite(sphere.radius) || sphere.radius <= 0) {
            this.arCamera.position.set(0, 1.5, 4);

            if (this.controls) {
                this.controls.target.set(0, 0, 0);
                this.controls.update();
            }

            return;
        }

        const radius = sphere.radius;
        const center = sphere.center.clone();

        const verticalFov = THREE.MathUtils.degToRad(this.arCamera.fov);
        const horizontalFov =
            2 * Math.atan(Math.tan(verticalFov / 2) * this.arCamera.aspect);

        const fitFov = Math.min(verticalFov, horizontalFov);
        const distance = (radius / Math.sin(fitFov / 2)) * 1.00;

        const direction = new THREE.Vector3(1, 0.65, 1).normalize();

        this.arCamera.position.copy(center).add(direction.multiplyScalar(distance));

        this.arCamera.near = Math.max(distance / 1000, 0.01);
        this.arCamera.far = Math.max(distance * 10, 500);
        this.arCamera.updateProjectionMatrix();

        if (this.controls) {
            this.controls.target.copy(center);
            this.controls.autoRotate = true;
            this.controls.enablePan = false;
            this.controls.enableDamping = true;
            this.controls.minDistance = radius * 0.4;
            this.controls.maxDistance = radius * 12;
            this.controls.update();
        }
    }

    onWindowResize() {
        if (this.isArRunning.value) {
            this.domWidth = window.innerWidth;
            this.domHeight = window.innerHeight;
        } else {
            const containerRect = this.domContainer?.getBoundingClientRect();

            this.domWidth = Math.max(containerRect?.width || 380, 1);
            this.domHeight = Math.max(containerRect?.height || 280, 1);

            this.arRenderer.domElement.style.width = "100%";
            this.arRenderer.domElement.style.height = "100%";
            this.arRenderer.domElement.style.display = "block";
        }

        this.#setSize(this.domWidth, this.domHeight);

        this.sceneManager.scenePlacementManager.reset(false);
        this.#resetCameraPosition();
    }

    #setSize(width, height) {
        this.arRenderer.setDomSize(width, height);
        this.labelRenderer.setDomSize(width, height);
        this.arCamera.setDomSize(width, height);
    }

    async isXrCompatible(mode = "ar") {
        return navigator.xr && await navigator.xr.isSessionSupported("immersive-" + mode);
    }

    isArRunning = computed(() => {
        return this.#isArRunning.value;
    });

    async start(mode = "ar") {
        this.#isArRunning.value = true;

        const options = mode === "ar" ? {
            requiredFeatures: ["hit-test", "dom-overlay"],
            domOverlay: {
                root: this.domOverlay,
            },
        } : {};

        try {
            this.arSession = await navigator.xr.requestSession(
                "immersive-" + mode,
                options
            );
        } catch (e) {
            if (e.name === "NotSupportedError") {
                if (
                    options.requiredFeatures &&
                    options.requiredFeatures.includes("dom-overlay")
                ) {
                    options.requiredFeatures.splice(
                        options.requiredFeatures.indexOf("dom-overlay"),
                        1
                    );
                }

                this.enable3dUI = true;

                this.arSession = await navigator.xr.requestSession(
                    "immersive-" + mode,
                    options
                );

                this.sceneManager.setXr(true);
            }
        }

        if (mode === "ar") {
            this.sceneManager.scenePlacementManager.enable();
        }

        if (mode === "vr") {
            this.enable3dUI = true;
            this.sceneManager.scenePlacementManager.disable();
            this.sceneManager.setXr(true);
        }

        this.xrMode = mode;
        await this.onSessionStarted();
    }

    async onSessionStarted() {
        this.arSession.addEventListener("end", this.onSessionEnded.bind(this));

        this.arRenderer.xr.setReferenceSpaceType("local");
        await this.arRenderer.xr.setSession(this.arSession);

        this.referenceSpace = await this.arRenderer.xr.getReferenceSpace();
        this.viewerSpace = await this.arSession.requestReferenceSpace("viewer");

        try {
            this.sceneManager.scenePlacementManager.hitTestSource =
                await this.arSession.requestHitTestSource({ space: this.viewerSpace });

            this.arSession.addEventListener(
                "select",
                this.sceneManager.onSceneClick.bind(this.sceneManager)
            );
        } catch (e) {
            this.sceneManager.scenePlacementManager.disable();
        }

        if (this.enable3dUI) {
            this.xr3dUi = new Xr3dUi(
                this.arRenderer,
                this.arCamera,
                this.arSession,
                this.sceneManager,
                this.referenceSpace,
                this.applyVrCameraPosition.bind(this),
                this.xrMode
            );

            this.xr3dUi.init();

            if (!(this.sceneManager.active.value instanceof ScenePlacementManager)) {
                this.xr3dUi.addToScene(this.sceneManager.active.value);
            }
        }

        if (this.xrMode === "vr" && this.sceneManager.active.value.vrStartPosition) {
            setTimeout(() => this.applyVrCameraPosition(), 100);
        }

        this.sceneManager.isArRunning.value = true;
    }

    applyVrCameraPosition() {
        if (this.xrMode !== "vr") {
            return;
        }

        const scene = this.sceneManager.active.value;

        if (!scene.vrStartPosition) {
            return;
        }

        const position = this.arRenderer.xr.getCamera(this.arCamera).position;
        const rotation = this.arRenderer.xr.getCamera(this.arCamera).quaternion;

        let group = scene.getObjectByName("vrCameraGroup");

        if (!group) {
            group = new THREE.Group();
            group.name = "vrCameraGroup";

            let index = 0;

            while (scene.children.length > index) {
                const child = scene.children[index];

                if (child.name === "UI" || child.name.startsWith("pointer")) {
                    index++;
                } else {
                    group.add(child);
                }
            }

            scene.add(group);
        }

        group.position.set(0, 0, 0);
        group.rotation.set(0, 0, 0);

        const translation = new THREE.Matrix4().makeTranslation(
            -scene.vrStartPosition.position.x,
            -scene.vrStartPosition.position.y,
            -scene.vrStartPosition.position.z
        );

        const rot = new THREE.Matrix4().makeRotationFromQuaternion(
            extractYawQuaternion(rotation)
        );

        rot.multiply(
            new THREE.Matrix4().makeRotationFromEuler(
                new THREE.Euler(
                    -scene.vrStartPosition.rotation.x,
                    -scene.vrStartPosition.rotation.y,
                    -scene.vrStartPosition.rotation.z,
                    "XYZ"
                )
            )
        );

        const transformation = new THREE.Matrix4()
            .multiply(rot)
            .multiply(translation);

        group.applyMatrix4(transformation);
        group.position.x += position.x;
        group.position.y += position.y;
        group.position.z += position.z;

        group.updateMatrixWorld();
    }

    removeVrCameraPosition() {
        for (let scene of this.sceneManager.scenes) {
            const group = scene.getObjectByName("vrCameraGroup");

            if (!group) {
                continue;
            }

            while (group.children.length > 0) {
                scene.add(group.children[0]);
            }

            scene.remove(group);
        }
    }

    async stop() {
        if (this.arSession != null) {
            await this.arSession.end();
        }
    }

    onSessionEnded() {
        this.arSession.removeEventListener("end", this.onSessionEnded.bind(this));
        this.arSession = null;
        this.sceneManager.scenePlacementManager.hitTestSource = null;
        this.#isArRunning.value = false;
        this.sceneManager.isArRunning.value = false;

        if (this.xrMode === "vr") {
            this.removeVrCameraPosition();
        }

        this.#resetCameraPosition();

        if (this.sceneManager.active.value.hasLabels.value) {
            this.sceneManager.active.value.labelPlayer.stop();
        }

        if (this.xr3dUi) {
            this.xr3dUi.removeFromScene(this.sceneManager.active.value);
        }
    }

    reset() {
        this.sceneManager.reset();
        this.#resetCameraPosition();
    }

    onXrFrame(time, frame) {
        this.sceneManager.onXrFrame(
            time,
            frame,
            this.referenceSpace,
            this.arCamera,
            this.arRenderer
        );

        this.controls.update();

        this.arRenderer.render(this.sceneManager.active.value, this.arCamera);

        if (
            this.sceneManager.active.value.hasLabels.value &&
            this.labelRenderer.isEnabled.value
        ) {
            this.labelRenderer.render(this.sceneManager.active.value, this.arCamera);
        } else {
            this.labelRenderer.clear();
        }

        if (this.xr3dUi) {
            this.xr3dUi.loop(frame);
        }
    }
}