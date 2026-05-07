import { ArScene } from "@/js/threeExt/scene/arScene.js";
import { ScenePlacementManager } from "@/js/threeExt/scene/scenePlacementManager.js";
import { computed, ref, watch } from "vue";
import { LightSet } from "@/js/threeExt/lighting/lightSet.js";

export class ArSceneManager {
    scenes;
    activeSceneId;

    scenePlacementManager;
    #lightEstimate;
    isArRunning;
    isSceneLoading;

    onSceneChanged;

    constructor(scenes, shadowMapSize, xr = false) {
        this.isArRunning = ref(false);
        this.isSceneLoading = ref(false);
        this.#lightEstimate = new LightSet(shadowMapSize);
        this.scenePlacementManager = new ScenePlacementManager();
        this._sceneLoadRequestId = 0;
        this.xr = xr;

        this.scenes = [];
        for (const sceneData of scenes) {
            this.scenes.push(new ArScene(sceneData, xr));
        }

        if (this.scenes.length === 0) {
            this.scenes.push(new ArScene({ id: 0, title: "None", assets: [] }));
        }

        this.activeSceneId = ref(this.scenes[0].sceneId);
        this.onSceneChanged = null;

        watch(this.active, () => {
            this.#updateLighting();
            this.active.value.resetLabels();

            if (this.onSceneChanged != null) {
                this.onSceneChanged();
            }
        });
    }

    activeSceneIndex = computed(() => {
        let index = 0;
        for (const scene of this.scenes) {
            if (scene.sceneId === this.activeSceneId.value) {
                return index;
            }
            index++;
        }
        return 0;
    });

    async init() {
        await this.scenePlacementManager.init();
        //on charge que 1ere scène
        const first = this.scenes[0];
        await this.loadScene(first);
        this.activeSceneId.value = first.sceneId;
        this.#updateLighting();
    }

    async reset() {
        this.scenePlacementManager.reset();
        await this.setFirstActive();
    }

    getBoundingSphere() {
        return this.active.value.computeBoundingSphere();
    }

    #updateLighting() {
        if (!this.active.value?.isLoaded && this.active.value !== this.scenePlacementManager) return;

        this.#lightEstimate.pushToScene(this.active.value);

        if (this.scenePlacementManager.isEnabled.value) return;

        const bounds = this.active.value.computeBoundingBox(false);
        const boundsMin = bounds.min.negate();
        const boundsMax = bounds.max;

        const maxVector = boundsMin.max(boundsMax);
        const maxComponent = Math.max(maxVector.x, maxVector.z);
        const double = maxComponent * 2;

        this.#lightEstimate.setLightPosition(double, double, double);
    }

    async loadScene(scene) {
        if (!scene) return;
        await scene.init();
    }

    async setActiveById(sceneId) {
        const scene = this.scenes.find((s) => String(s.sceneId) === String(sceneId));
        if (!scene) return false;

        const requestId = ++this._sceneLoadRequestId;
        this.isSceneLoading.value = true;

        try {
            await this.loadScene(scene);

            if (requestId !== this._sceneLoadRequestId) return false;

            this.activeSceneId.value = scene.sceneId;
            return true;
        } finally {
            if (requestId === this._sceneLoadRequestId) {
                this.isSceneLoading.value = false;
            }
        }
    }

    async setFirstActive() {
        const first = this.scenes[0];
        return this.setActiveById(first.sceneId);
    }

    async setPreviousActive() {
        if (this.hasPrevious.value) {
            await this.setActiveById(this.previous.value.sceneId);
        }
    }

    async setNextActive() {
        if (this.hasNext.value) {
            await this.setActiveById(this.next.value.sceneId);
        }
    }

    active = computed(() => {
        return this.scenePlacementManager.isEnabled.value && this.isArRunning.value
            ? this.scenePlacementManager
            : this.scenes[this.activeSceneIndex.value];
    });

    next = computed(() => {
        if (!this.hasNext.value) return null;
        return this.scenes[this.activeSceneIndex.value + 1];
    });

    previous = computed(() => {
        if (!this.hasPrevious.value) return null;
        return this.scenes[this.activeSceneIndex.value - 1];
    });

    hasNext = computed(() => {
        return this.activeSceneIndex.value < this.scenes.length - 1;
    });

    hasPrevious = computed(() => {
        return this.activeSceneIndex.value > 0;
    });

    onXrFrame(time, frame, localSpace, camera, renderer) {
        this.active.value.onXrFrame(
            time,
            frame,
            localSpace,
            this.scenePlacementManager.getWorldTransformMatrix(),
            camera,
            renderer
        );
    }

    onSceneClick() {
        if (
            this.scenePlacementManager.isStabilized.value &&
            this.scenePlacementManager.isEnabled.value
        ) {
            this.scenePlacementManager.disable();
        }
    }

    getScenes() {
        return this.scenes;
    }

    getActiveContentScene() {
        return this.scenes[this.activeSceneIndex.value];
    }

    setXr(xr) {
        this.xr = xr;
        for (const scene of this.scenes) {
            scene.setXr(xr);
        }
    }
}
