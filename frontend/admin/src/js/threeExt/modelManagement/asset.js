import { SelectableInterface } from "@/js/threeExt/interfaces/selectableInterface.js";
import { LoadableInterface } from "@/js/threeExt/interfaces/loadableInterface.js";
import { classes } from "@/js/utils/extender.js";
import { computed, ref } from "vue";
import { Mesh } from "@/js/threeExt/modelManagement/mesh.js";
import * as THREE from "three";

function safeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function safeVec3(value, fallback) {
    return {
        x: safeNumber(value?.x, fallback.x),
        y: safeNumber(value?.y, fallback.y),
        z: safeNumber(value?.z, fallback.z),
    };
}

function parseLodMeta(raw) {
    if (!raw) return null;
    if (typeof raw === "object") return raw;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export class Asset extends classes(SelectableInterface, LoadableInterface) {
    id;
    subMeshes;
    name;
    hideInViewer;
    sourceUrl;
    simplifiedUrl;
    uploadData;
    position;
    rotation;
    scale;

    #hasError;
    #errorMessage;
    #isLoading;
    #isSelected;
    animationMixer;
    animations;
    activeAnimation;

    copiedUrl;

    constructor(assetData) {
        super();
        this.id = assetData.id;
        this.subMeshes = [];
        this.#isSelected = ref(false);

        this.sourceUrl = assetData.url;
        this.simplifiedUrl = assetData.simplifiedUrl ?? null;
        this.name = assetData.name;

        this.hideInViewer = ref(assetData.hideInViewer);
        this.uploadData = assetData.uploadData || null;

        this.activeAnimation = assetData.activeAnimation || null;
        this.animations = [];

        this.mesh = new THREE.Mesh();

        this.position = safeVec3(assetData.position, { x: 0, y: 0, z: 0 });
        this.rotation = safeVec3(assetData.rotation, { x: 0, y: 0, z: 0 });
        this.scale = safeVec3(assetData.scale, { x: 1, y: 1, z: 1 });

        this.#hasError = ref(false);
        this.#errorMessage = ref("");
        this.#isLoading = ref(true);
        this.lodMeta = parseLodMeta(assetData.lodMeta);
        this.kind = assetData.kind ?? assetData.assetKind ?? this.lodMeta?.assetKind ?? null;
        this.pointCloud = assetData.pointCloud ?? assetData.pointcloud ?? this.lodMeta?.pointCloud ?? null;
        this.needsReloadAfterUpload = false;

        if (assetData?.copiedUrl) this.copiedUrl = assetData.copiedUrl;
    }

    hasError = computed(() => this.#hasError.value);
    errorMessage = computed(() => this.#errorMessage.value);
    isLoading = computed(() => this.#isLoading.value);
    isSelected = computed(() => this.#isSelected.value);

    setSelected(selected) {
        this.#isSelected.value = selected;
    }

    switchViewerDisplayStatus() {
        this.hideInViewer.value = !this.hideInViewer.value;
    }

    setUploadedAtUrl(url) {
        this.uploadData = null;
        this.sourceUrl = url;
    }

    setLoading(value) {
        this.#isLoading.value = !!value;
    }

    setHasError(value) {
        this.#hasError.value = !!value;
        if (!value) this.#errorMessage.value = "";
    }

    markLoaded() {
        this.#isLoading.value = false;
        this.#hasError.value = false;
        this.#errorMessage.value = "";
    }

    markLoadFailed(error = null) {
        this.#isLoading.value = false;
        this.#hasError.value = true;
        this.#errorMessage.value = error?.message || String(error ?? "");
    }

    load(options = {}) {
        console.warn("[Asset.load] deprecated - use ResourceLoader instead");

        const urlOverride = options.urlOverride ?? null;
        const forceUpload = !!options.forceUpload;

        let meshToLoad;
        if (forceUpload || this.uploadData != null) {
            meshToLoad = new Mesh(null, this.uploadData);
        } else {
            const urlToLoad = urlOverride ?? this.sourceUrl;
            meshToLoad = new Mesh(urlToLoad, null);
        }

        return meshToLoad.load().then((mesh) => {
            this.#isLoading.value = false;
            this.#hasError.value = false;
            this.#errorMessage.value = "";

            mesh.position.set(this.position.x, this.position.y, this.position.z);
            mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
            mesh.scale.set(this.scale.x, this.scale.y, this.scale.z);

            this.mesh = mesh;
            this.animations = mesh.animations;
            return this.mesh;
        }).catch((e) => {
            this.#isLoading.value = false;
            this.#hasError.value = true;
            this.#errorMessage.value = e?.message || String(e ?? "");
            throw e;
        });
    }

    addSubMesh(mesh) {
        this.subMeshes.push(mesh);
    }

    getObject() {
        return this.mesh;
    }

    updateRenderFrame(camera, renderer) {
        this.mesh?.updatePointCloudStreaming?.(camera, renderer);
    }

    getResultPosition() {
        return { x: this.getObject().position.x, y: this.getObject().position.y, z: this.getObject().position.z };
    }

    getResultRotation() {
        return { x: this.getObject().rotation.x, y: this.getObject().rotation.y, z: this.getObject().rotation.z };
    }

    getResultScale() {
        return { x: this.getObject().scale.x, y: this.getObject().scale.y, z: this.getObject().scale.z };
    }
}
