import * as THREE from "three";
import { Asset } from "@/js/threeExt/modelManagement/asset.js";
import { computed, shallowReactive } from "vue";
import { ArMeshLoadError } from "@/js/threeExt/error/arMeshLoadError.js";
import { ShadowPlane } from "@/js/threeExt/lighting/shadowPlane.js";
import { AbstractScene } from "@/js/threeExt/scene/abstractScene.js";
import { LabelPlayer } from "@/js/threeExt/postProcessing/labelPlayer.js";
import { EmptyAsset } from "@/js/threeExt/modelManagement/emptyAsset.js";
import { EXRLoader } from "three/addons";
import { getResource } from "@/js/endpoints.js";
import { MeshManager } from "../modelManagement/meshManager";
import { buildAssetRuntimeMetrics } from "@/js/threeExt/runtimeLod/runtimeMetrics.js";
import { selectAssetVariant, limitAutoUpgradeStep } from "@/js/threeExt/runtimeLod/variantSelector.js";
import { ensureAssetVariant } from "@/js/threeExt/runtimeLod/variantApplier.js";

function ensureLodDebugOverlay() {
    let el = document.getElementById("lod-debug-overlay");

    if (!el) {
        el = document.createElement("div");
        el.id = "lod-debug-overlay";
        el.style.position = "fixed";
        el.style.top = "12px";
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

export class ArScene extends AbstractScene {
    sceneId;
    title;
    description;
    #assets;
    meshDataMap;
    labelPlayer;
    #shadowPlane;
    #errors;
    #boundingSphere;
    #boundingBox;
    clock;
    vrStartPosition;

    constructor(sceneData) {
        super();

        this.sceneId = sceneData.id;
        this.title = sceneData.title;
        this.description = sceneData.description;
        this.#assets = [];
        this.meshDataMap = new Map();
        this.meshManager = new MeshManager();
        this.vrStartPosition = sceneData?.vrStartPosition ?? null;

        for (const assetData of sceneData.assets) {
            this.#assets.push(new Asset(assetData));
        }

        for (const meshData of sceneData.meshes) {
            this.meshDataMap.set(meshData.name, meshData);
        }

        if (this.#assets.length === 0) {
            this.#assets.push(new EmptyAsset());
        }

        this.labelPlayer = new LabelPlayer();
        for (const labelData of sceneData.labels) {
            this.labelPlayer.addToScene(this, labelData);
        }

        this.#errors = [];
        this.#boundingSphere = null;
        this.#boundingBox = null;

        if (sceneData.envmapUrl) {
            this.environment = new EXRLoader().load(
                getResource(sceneData.envmapUrl),
                (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                }
            );
        }

        this.clock = new THREE.Clock();

        this._lastVariantUpdateTime = 0;
        this._variantUpdateIntervalMs = 100;
        this._lodConfig = {
            originalMin: 0.20,
            n1Min: 0.10,
            n2Min: 0.04,
            hysteresis: 0.01,
        };

        this.debugLod = {
            current: null,
            auto: null,
            forced: null,
            final: null,
        };

        this.devicePolicy = null;
        this._lodSwapInProgress = false;
        this._lodExperimentEnabled = true;
        this._lodManualMode = false;
        this._forcedVariantByAssetId = new Map();
        this._latestLodStateByAssetId = new Map();
        this._experimentLogs = [];

        this._fpsSample = {
            lastTime: null,
            instantFps: 0,
            avgFps: 0,
            samples: [],
            maxSamples: 60,
        };

        this._experimentLogs = [];
        this._calibrationScaleStep = 1.15;
        this._calibrationMinScaleFactor = 0.25;
        this._calibrationMaxScaleFactor = 4.0;
        this._calibrationOriginalScaleByAssetId = new Map();
        this._calibrationScaleFactorByAssetId = new Map();
    }

    getAssetSubMeshes(assetData) {
        const subMeshes = [];

        const step = (child, transform) => {
            for (const children of child.children) {
                if ("material" in children) {
                    children.applyMatrix4(transform);
                    subMeshes.push(children);
                } else {
                    const newTransform = new THREE.Matrix4();
                    step(children, newTransform.multiplyMatrices(transform, children.matrix));
                }
            }
        };

        if (assetData.object) {
            step(assetData.object, new THREE.Matrix4());
        } else {
            subMeshes.push(assetData.mesh);
        }

        return subMeshes;
    }

    updateAssetSubMeshes(assetData) {
        const step = (child, transform) => {
            for (const children of child.children) {
                if ("material" in children) {

                    const subMeshData = this.meshDataMap.get(children.name);
                    this.meshManager.updateSubMesh(children, subMeshData);
                    children.updateMatrixWorld();
                    if (!children.geometry.attributes.normal) {
                        children.geometry.computeVertexNormals();
                    }

                } else {
                    const newTransform = new THREE.Matrix4();
                    step(children, newTransform.multiplyMatrices(transform, children.matrix));
                }
            }
        };

        if (assetData.object) {
            step(assetData.object, new THREE.Matrix4());
        }
    }

    async init() {
        for (const assetData of this.#assets) {
            await assetData.load();
            if (assetData.hasError() || !assetData.object) {
                this.#errors.push(new ArMeshLoadError(assetData.sourceUrl));
                console.error(`[ArScene] Failed to load asset: ${assetData.sourceUrl}`);
                continue;
            }

           // this.updateAssetSubMeshes(assetData);
            this.add(assetData.object);
        }

        this.computeBoundingSphere(true);
        this.#shadowPlane = new ShadowPlane(this.computeBoundingBox(false));
        this.#shadowPlane.pushToScene(this);
    }

    getErrors = computed(() => this.#errors);

    hasDescription() {
        return this.description != null && this.description.trim().length > 0;
    }

    hasLabels = computed(() => this.labelPlayer.hasLabels.value);

    hasAnimation = computed(() => {
        return this.hasLabels.value && this.labelPlayer.getDuration() > 0;
    });

    resetLabels = () => {
        this.labelPlayer.reset();
    };

    computeBoundingBox(forceCompute = false) {
        if (forceCompute || this.#boundingBox == null) {
            const group = new THREE.Group();
            for (const asset of this.#assets) {
                if (!asset?.object) continue;
                group.add(asset.object.clone());
            }
            this.#boundingBox = new THREE.Box3().setFromObject(group);
        }
        return this.#boundingBox;
    }

    computeBoundingSphere(forceCompute = false) {
        if (forceCompute || this.#boundingSphere == null) {
            const center = new THREE.Vector3();
            this.computeBoundingBox(forceCompute).getCenter(center);
            this.#boundingSphere = this.computeBoundingBox().getBoundingSphere(
                new THREE.Sphere(center)
            );
        }
        return this.#boundingSphere;
    }

    updateFpsStats(time) {
        if (this._fpsSample.lastTime == null) {
            this._fpsSample.lastTime = time;
            return;
        }

        const deltaMs = time - this._fpsSample.lastTime;
        this._fpsSample.lastTime = time;

        if (deltaMs <= 0) return;

        const fps = 1000 / deltaMs;
        this._fpsSample.instantFps = fps;
        this._fpsSample.samples.push(fps);

        if (this._fpsSample.samples.length > this._fpsSample.maxSamples) {
            this._fpsSample.samples.shift();
        }

        const sum = this._fpsSample.samples.reduce((a, b) => a + b, 0);
        this._fpsSample.avgFps = this._fpsSample.samples.length
            ? sum / this._fpsSample.samples.length
            : 0;
    }

    getFpsStats() {
        return {
            instantFps: Number((this._fpsSample.instantFps || 0).toFixed(2)),
            avgFps: Number((this._fpsSample.avgFps || 0).toFixed(2)),
            sampleCount: this._fpsSample.samples.length,
        };
    }

    isLodManualMode() {
        return this._lodManualMode;
    }

    setLodManualMode(enabled) {
        this._lodManualMode = !!enabled;
        console.log("[LOD EXPERIMENT] manual mode =", this._lodManualMode);
    }

    toggleLodManualMode() {
        this._lodManualMode = !this._lodManualMode;
        console.log("[LOD EXPERIMENT] manual mode =", this._lodManualMode);
        return this._lodManualMode;
    }

    getExperimentTargetAsset() {
        for (const asset of this.#assets) {
            if (!asset?.object) continue;
            if (asset instanceof EmptyAsset) continue;
            return asset;
        }
        return null;
    }

    getNextVariantInCycle(currentVariant) {
        const order = ["original", "n1", "n2", "n3"];
        let current = currentVariant ?? "original";
        if (current === "simplified") current = "n1";

        const index = order.indexOf(current);
        if (index === -1) return "original";
        return order[(index + 1) % order.length];
    }

    async cycleExperimentVariant() {
        const asset = this.getExperimentTargetAsset();

        if (!asset) {
            console.warn("[LOD UI] no target asset");
            return null;
        }

        // Si on clique sur Next LOD, on considère qu'on veut contrôler manuellement.
        if (!this._lodManualMode) {
            this._lodManualMode = true;
            console.log("[LOD UI] manual mode enabled by Next LOD button");
        }

        const baseVariant =
            asset.queuedTargetVariant ??
            asset.pendingTargetVariant ??
            asset.currentVariant;

        const nextVariant = this.getNextVariantInCycle(baseVariant);
        this._forcedVariantByAssetId.set(asset.id, nextVariant);

        if (asset.isVariantSwapPending) {
            asset.queuedTargetVariant = nextVariant;

            console.log("[LOD UI] next LOD queued", {
                assetId: asset.id,
                currentVariant: asset.currentVariant,
                pendingTargetVariant: asset.pendingTargetVariant,
                queuedTargetVariant: asset.queuedTargetVariant,
            });

            return nextVariant;
        }

        this.startVariantSwap(asset, nextVariant);

        console.log("[LOD UI] next LOD requested", {
            assetId: asset.id,
            currentVariant: asset.currentVariant,
            requestedVariant: nextVariant,
        });

        return nextVariant;
    }

    getCurrentLodPolicySnapshot() {
        return {
            deviceClass: this.devicePolicy?.deviceClass ?? null,
            variantUpdateIntervalMs: this._variantUpdateIntervalMs,
            lodConfig: { ...this._lodConfig },
            deviceInfo: this.devicePolicy?.info ?? null,
        };
    }

    async logCurrentExperimentSnapshot(extra = {}) {
        const asset = this.getExperimentTargetAsset();
        if (!asset) {
            console.warn("[LOD EXPERIMENT] no target asset to log");
            return null;
        }

        const latest = this._latestLodStateByAssetId.get(asset.id) ?? null;
        if (!latest) {
            console.warn("[LOD EXPERIMENT] no latest LOD state yet for asset", asset.id);
            return null;
        }

        const record = {
            mode: this._lodManualMode ? "manual" : "auto",
            assetName: asset.name,

            currentVariant: asset.currentVariant ?? null,
            autoTargetVariant: latest.autoTargetVariant,
            forcedVariant: latest.forcedVariant,
            finalTargetVariant: latest.finalTargetVariant,

            swapPending: latest.swapPending,
            pendingTargetVariant: latest.pendingTargetVariant,
            queuedTargetVariant: latest.queuedTargetVariant,

            visibleCoverage: latest.visibleCoverage,
            screenPx: {
                w: latest.screenWidthPx,
                h: latest.screenHeightPx,
            },

            cameraDepth: latest.cameraDepth,

            fps: {
                instantFps: latest.instantFps,
                avgFps: latest.avgFps,
            },

            extra,
        };

        this._experimentLogs.push(record);
        console.log("[LOD EXPERIMENT][SNAPSHOT]", record);

        return record;
    }

    //télécharge tous les logs en json
    exportExperimentLogs() {
        const payload = {
            exportedAt: new Date().toISOString(),
            deviceClass: this.devicePolicy?.deviceClass ?? null,
            sceneId: this.sceneId,
            sceneTitle: this.title,
            lodConfig: { ...this._lodConfig },

            count: this._experimentLogs.length,
            records: this._experimentLogs,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lod-experiment-${this.sceneId}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log("[LOD EXPERIMENT] exported", {
            count: this._experimentLogs.length,
        });
    }

    getExperimentLogsCount() {
        return this._experimentLogs.length;
    }

    startVariantSwap(asset, targetVariant) {
        if (!asset || !targetVariant) return;

        if (asset.currentVariant === targetVariant) {
            return;
        }

        if (asset.isVariantSwapPending) {
            asset.queuedTargetVariant = targetVariant;
            return;
        }

        ensureAssetVariant(asset, this, targetVariant)
            .then((changed) => {
                if (changed) {
                    this.#boundingBox = null;
                    this.#boundingSphere = null;

                    const obj = asset.object;

                    console.log("[LOD SWAP DONE]", {
                        assetId: asset.id,
                        from: asset.previousVariant ?? null,
                        current: asset.currentVariant,
                        requested: targetVariant,
                        queued: asset.queuedTargetVariant ?? null,
                        localPos: obj ? {
                            x: obj.position.x.toFixed(2),
                            y: obj.position.y.toFixed(2),
                            z: obj.position.z.toFixed(2),
                        } : null,
                    });
                }

                const queued = asset.queuedTargetVariant;
                asset.queuedTargetVariant = null;

                if (queued && queued !== asset.currentVariant) {
                    this.startVariantSwap(asset, queued);
                }
            })
            .catch((e) => {
                console.error("[LOD SWAP ERROR]", {
                    assetId: asset.id,
                    requestedVariant: targetVariant,
                    error: e,
                });
            });
    }
    getCalibrationTargetAsset() {
        return this.getExperimentTargetAsset();
    }

    ensureCalibrationBaseScale(asset) {
        if (!asset?.object) return null;

        if (!this._calibrationOriginalScaleByAssetId.has(asset.id)) {
            this._calibrationOriginalScaleByAssetId.set(asset.id, {
                x: asset.object.scale.x,
                y: asset.object.scale.y,
                z: asset.object.scale.z,
            });

            this._calibrationScaleFactorByAssetId.set(asset.id, 1);
        }

        return this._calibrationOriginalScaleByAssetId.get(asset.id);
    }

    applyCalibrationScale(asset, factor) {
        if (!asset?.object) return null;

        const baseScale = this.ensureCalibrationBaseScale(asset);
        if (!baseScale) return null;

        const clampedFactor = THREE.MathUtils.clamp(
            factor,
            this._calibrationMinScaleFactor,
            this._calibrationMaxScaleFactor
        );

        asset.object.scale.set(
            baseScale.x * clampedFactor,
            baseScale.y * clampedFactor,
            baseScale.z * clampedFactor
        );

        asset.object.updateMatrixWorld(true);

        this._calibrationScaleFactorByAssetId.set(asset.id, clampedFactor);

        this.#boundingBox = null;
        this.#boundingSphere = null;

        console.log("[LOD CALIBRATION] scale changed", {
            assetId: asset.id,
            assetName: asset.name,
            scaleFactor: clampedFactor,
        });

        return clampedFactor;
    }

    increaseCalibrationSize() {
        const asset = this.getCalibrationTargetAsset();
        if (!asset) return null;

        const current = this._calibrationScaleFactorByAssetId.get(asset.id) ?? 1;
        return this.applyCalibrationScale(asset, current * this._calibrationScaleStep);
    }

    decreaseCalibrationSize() {
        const asset = this.getCalibrationTargetAsset();
        if (!asset) return null;

        const current = this._calibrationScaleFactorByAssetId.get(asset.id) ?? 1;
        return this.applyCalibrationScale(asset, current / this._calibrationScaleStep);
    }

    resetCalibrationSize() {
        const asset = this.getCalibrationTargetAsset();
        if (!asset?.object) return null;

        const baseScale = this._calibrationOriginalScaleByAssetId.get(asset.id);

        if (!baseScale) {
            return this.applyCalibrationScale(asset, 1);
        }

        asset.object.scale.set(baseScale.x, baseScale.y, baseScale.z);
        asset.object.updateMatrixWorld(true);

        this._calibrationScaleFactorByAssetId.set(asset.id, 1);

        this.#boundingBox = null;
        this.#boundingSphere = null;

        console.log("[LOD CALIBRATION] scale reset", {
            assetId: asset.id,
            assetName: asset.name,
        });

        return 1;
    }

    async logCalibrationJudgement(qualityJudgement, extra = {}) {
        const asset = this.getCalibrationTargetAsset();

        if (!asset) {
            console.warn("[LOD CALIBRATION] no target asset");
            return null;
        }

        const latest = this._latestLodStateByAssetId.get(asset.id) ?? null;

        if (!latest) {
            console.warn("[LOD CALIBRATION] no latest LOD state yet");
            return null;
        }

        const record = {
            type: "calibration-judgement",

            mode: this._lodManualMode ? "manual" : "auto",
            assetName: asset.name,

            qualityJudgement, // "acceptable" or "reject"

            currentVariant: asset.currentVariant ?? null,
            autoTargetVariant: latest.autoTargetVariant,
            forcedVariant: latest.forcedVariant,
            finalTargetVariant: latest.finalTargetVariant,

            swapPending: latest.swapPending,
            pendingTargetVariant: latest.pendingTargetVariant,
            queuedTargetVariant: latest.queuedTargetVariant,

            calibrationScaleFactor: this._calibrationScaleFactorByAssetId.get(asset.id) ?? 1,

            visibleCoverage: latest.visibleCoverage,
            screenPx: {
                w: latest.screenWidthPx,
                h: latest.screenHeightPx,
            },
            cameraDepth: latest.cameraDepth,
            fps: {
                instantFps: latest.instantFps,
                avgFps: latest.avgFps,
            },

            extra,
        };

        this._experimentLogs.push(record);

        console.log("[LOD CALIBRATION][JUDGEMENT]", record);

        return record;
    }

    onXrFrame(time, frame, localReferenceSpace, worldTransformMatrix, camera, renderer) {
        worldTransformMatrix.decompose(this.position, this.quaternion, this.scale);

        const el = document.getElementById("placement-debug-overlay");
        if (el) {
            el.innerHTML += "<br>" + [
                `sceneY: ${this.position.y.toFixed(3)}`,
                `sceneX: ${this.position.x.toFixed(3)}`,
                `sceneZ: ${this.position.z.toFixed(3)}`
            ].join("<br>");
        }

        if (!this._lastSceneDebugPos) {
            this._lastSceneDebugPos = new THREE.Vector3();
        }

        const sceneMove = this.position.distanceTo(this._lastSceneDebugPos);
        if (sceneMove > 0.02) {
            console.log("[AR SCENE MOVE]", {
                sceneId: this.sceneId,
                position: {
                    x: Number(this.position.x.toFixed(3)),
                    y: Number(this.position.y.toFixed(3)),
                    z: Number(this.position.z.toFixed(3)),
                },
                delta: Number(sceneMove.toFixed(4)),
            });

            this._lastSceneDebugPos.copy(this.position);
        }

        const delta = this.clock.getDelta();
        for (const asset of this.#assets) {
            if (asset.animationMixer) {
                asset.animationMixer.update(delta);
            }
        }

        this.updateFpsStats(time);

        this.labelPlayer.onXrFrame(
            time,
            frame,
            localReferenceSpace,
            worldTransformMatrix,
            camera,
            renderer
        );

        const now = performance.now();

        if (now - this._lastVariantUpdateTime < this._variantUpdateIntervalMs) {
            return;
        }

        this._lastVariantUpdateTime = now;

        for (const asset of this.#assets) {
            if (!asset?.object) continue;
            if (asset instanceof EmptyAsset) continue;

            asset.getManifest()
                .then((manifest) => {
                    if (!manifest) return;

                    const metrics = buildAssetRuntimeMetrics(asset, camera, renderer);

                    const autoTargetVariant = selectAssetVariant(
                        manifest,
                        metrics,
                        this._lodConfig,
                        asset.currentVariant
                    );

                    const forcedVariant = this._lodManualMode ? (this._forcedVariantByAssetId.get(asset.id) ?? null) : null;

                    let finalTargetVariant = forcedVariant || autoTargetVariant;

                    /*
                      En AUTO on évite les gros sauts inutiles MAIS si l'objet devient vraiment grand à l'écran
                      limitAutoUpgradeStep autorise le jump direct vers original.
                     */
                    if (!this._lodManualMode) {
                        finalTargetVariant = limitAutoUpgradeStep(
                            asset.currentVariant,
                            finalTargetVariant,
                            metrics,
                            this._lodConfig
                        );
                    }

                    const fps = this.getFpsStats();

                    this._latestLodStateByAssetId.set(asset.id, {
                        currentVariant: asset.currentVariant ?? null,
                        autoTargetVariant,
                        forcedVariant,
                        finalTargetVariant,

                        swapPending: !!asset.isVariantSwapPending,
                        pendingTargetVariant: asset.pendingTargetVariant ?? null,
                        queuedTargetVariant: asset.queuedTargetVariant ?? null,

                        visibleCoverage: Number((metrics.visibleCoverage ?? 0).toFixed(6)),
                        screenWidthPx: Number((metrics.screenWidthPx ?? 0).toFixed(0)),
                        screenHeightPx: Number((metrics.screenHeightPx ?? 0).toFixed(0)),
                        cameraDepth: Number((metrics.cameraDepth ?? 0).toFixed(4)),
                        sphereRadius: Number((metrics.sphereRadius ?? 0).toFixed(4)),
                        isBehindCamera: !!metrics.isBehindCamera,

                        instantFps: fps.instantFps,
                        avgFps: fps.avgFps,
                    });

                    asset.debugLod = {
                        depth: Number((metrics.cameraDepth ?? Infinity).toFixed(2)),
                        visibleCoverage: Number((metrics.visibleCoverage ?? 0).toFixed(4)),
                        widthPx: Number((metrics.screenWidthPx ?? 0).toFixed(0)),
                        heightPx: Number((metrics.screenHeightPx ?? 0).toFixed(0)),
                        sphereRadius: Number((metrics.sphereRadius ?? 0).toFixed(3)),
                        isBehindCamera: !!metrics.isBehindCamera,
                        current: asset.currentVariant ?? null,
                        auto: autoTargetVariant ?? null,
                        forced: forcedVariant ?? null,
                        final: finalTargetVariant ?? null,
                    };

                    if (this.#assets[0] === asset) {
                        const overlay = ensureLodDebugOverlay();

                        const colorMap = {
                            original: "rgba(46, 204, 113, 0.9)",
                            n1: "rgba(241, 196, 15, 0.9)",
                            n2: "rgba(230, 126, 34, 0.9)",
                            n3: "rgba(231, 76, 60, 0.9)",
                            simplified: "rgba(52, 152, 219, 0.9)",
                        };

                        overlay.style.background = colorMap[finalTargetVariant] || "rgba(0,0,0,0.8)";
                        overlay.innerHTML = [
                            `mode: ${this._lodManualMode ? "manual" : "auto"}`,
                            `pending: ${asset.isVariantSwapPending ? "yes" : "no"}`,
                            `loading: ${asset.pendingTargetVariant ?? "-"}`,
                            `queued: ${asset.queuedTargetVariant ?? "-"}`,
                            `calibScale: ${(this._calibrationScaleFactorByAssetId.get(asset.id) ?? 1).toFixed(2)}x`,
                            `fps: ${fps.instantFps.toFixed(1)} / avg ${fps.avgFps.toFixed(1)}`,
                            `depth: ${(metrics.cameraDepth ?? Infinity).toFixed(2)}`,
                            `visCover: ${((metrics.visibleCoverage ?? 0) * 100).toFixed(1)}%`,
                            `hPx: ${(metrics.screenHeightPx ?? 0).toFixed(0)}px`,
                            `wPx: ${(metrics.screenWidthPx ?? 0).toFixed(0)}px`,
                            `sphereR: ${(metrics.sphereRadius ?? 0).toFixed(3)}`,
                            `behind: ${metrics.isBehindCamera ? "yes" : "no"}`,
                            `current: ${asset.currentVariant ?? "-"}`,
                            `auto: ${autoTargetVariant ?? "-"}`,
                            `forced: ${forcedVariant ?? "-"}`,
                            `final: ${finalTargetVariant ?? "-"}`,
                        ].join("<br>");
                    }

                    const debugSignature =
                        `${asset.currentVariant}|${autoTargetVariant}|${forcedVariant}|${finalTargetVariant}|${asset.pendingTargetVariant}|${asset.queuedTargetVariant}`;

                    if (asset.lastDebugTargetVariant !== debugSignature) {
                        console.log("[LOD CHANGE]", {
                            assetId: asset.id,
                            currentVariant: asset.currentVariant ?? null,
                            autoTargetVariant,
                            forcedVariant,
                            finalTargetVariant,
                            swapPending: !!asset.isVariantSwapPending,
                            pendingTargetVariant: asset.pendingTargetVariant ?? null,
                            queuedTargetVariant: asset.queuedTargetVariant ?? null,
                            cameraDepth: Number((metrics.cameraDepth ?? 0).toFixed(4)),
                            visibleCoverage: Number((metrics.visibleCoverage ?? 0).toFixed(6)),
                            screenWidthPx: Number((metrics.screenWidthPx ?? 0).toFixed(0)),
                            screenHeightPx: Number((metrics.screenHeightPx ?? 0).toFixed(0)),
                            sphereRadius: Number((metrics.sphereRadius ?? 0).toFixed(4)),
                            isBehindCamera: !!metrics.isBehindCamera,
                            manualMode: this._lodManualMode,
                        });

                        asset.lastDebugTargetVariant = debugSignature;
                    }

                    /* Si un swap est déjà en cours, on ne lance pas un autre swap auto.
                     En AUTO, on ne queue pas les targets car ils peuvent devenir obsolètes en AR.
                     En MANUAL, on garde la dernière demande utilisateur.
                     */
                    if (asset.isVariantSwapPending) {
                        if (
                            this._lodManualMode &&
                            forcedVariant &&
                            forcedVariant !== asset.pendingTargetVariant
                        ) {
                            asset.queuedTargetVariant = forcedVariant;
                        }

                        return;
                    }

                    if (finalTargetVariant && finalTargetVariant !== asset.currentVariant) {
                        this.startVariantSwap(asset, finalTargetVariant);
                    }
                })
                .catch((e) => {
                    console.error("[LOD LOOP ERROR]", asset?.id, e);
                });
        }
    }

    hasAssets() {
        return !(this.#assets.length === 0 || this.#assets[0] instanceof EmptyAsset);
    }

    getAssets() {
        return shallowReactive(this.#assets);
    }

    findAssetById(id) {
        for (const asset of this.#assets) {
            if (asset.id === id) return asset;
        }
        return null;
    }

    postSwapAssetUpdate(asset) {
        if (!asset?.object) return;
        this.updateAssetSubMeshes(asset);
        this.#boundingBox = null;
        this.#boundingSphere = null;
    }

    setDevicePolicy(policy) {
        this.devicePolicy = policy;

        if (!policy) return;

        if (policy.variantUpdateIntervalMs != null) {
            this._variantUpdateIntervalMs = policy.variantUpdateIntervalMs;
        }

        if (policy.lodConfig) {
            this._lodConfig = {
                ...this._lodConfig,
                ...policy.lodConfig,
            };
        }

        console.log("[HERA][scenePolicyApplied]", {
            sceneId: this.sceneId,
            variantUpdateIntervalMs: this._variantUpdateIntervalMs,
            lodConfig: this._lodConfig,
            deviceClass: policy.deviceClass,
        });
    }
}