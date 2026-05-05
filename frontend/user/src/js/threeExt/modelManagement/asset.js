import { SceneElementInterface } from "@/js/threeExt/interfaces/sceneElementInterface.js";
import * as THREE from "three";
import { reactive, ref } from "vue";
import { ObjectManager } from "@/js/threeExt/modelManagement/objectManager.js";
import { fetchAssetManifest, pickVariantFromManifest } from "@/js/threeExt/assetManifest.js";
import {getResource} from "@/js/endpoints.js";

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

function isValidVec3(value) {
    return (
        value &&
        Number.isFinite(value.x) &&
        Number.isFinite(value.y) &&
        Number.isFinite(value.z)
    );
}
function applyVariantDebugColor(object, variant) {
    const colorMap = {
        original: 0x073763,
        n1: 0xffff00,
        n2: 0xff8800,
        n3: 0xff0000,
    };

    const color = colorMap[variant] ?? 0xffffff;

    object.traverse((child) => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    if (mat.color) mat.color.setHex(color);
                });
            } else {
                if (child.material.color) {
                    child.material.color.setHex(color);
                }
            }
        }
    });
}

function debugMeshNames(label, obj) {
    const names = [];
    obj?.traverse((child) => {
        if (child.isMesh) {
            names.push(child.name);
        }
    });
    console.log(`[${label}] mesh names`, names);
}

function debugObjectAlignment(label, obj) {
    if (!obj) {
        console.log(`[${label}] no object`);
        return;
    }

    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    const worldPos = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(size);
    obj.getWorldPosition(worldPos);

    console.log(`[${label}] alignment`, {
        rootPosition: {
            x: Number(obj.position.x.toFixed(3)),
            y: Number(obj.position.y.toFixed(3)),
            z: Number(obj.position.z.toFixed(3)),
        },
        worldPosition: {
            x: Number(worldPos.x.toFixed(3)),
            y: Number(worldPos.y.toFixed(3)),
            z: Number(worldPos.z.toFixed(3)),
        },
        bboxCenter: {
            x: Number(center.x.toFixed(3)),
            y: Number(center.y.toFixed(3)),
            z: Number(center.z.toFixed(3)),
        },
        bboxSize: {
            x: Number(size.x.toFixed(3)),
            y: Number(size.y.toFixed(3)),
            z: Number(size.z.toFixed(3)),
        },
    });
}

function debugRootChildren(label, obj) {
    if (!obj) {
        console.log(`[${label}] no object`);
        return;
    }

    const childrenInfo = obj.children.map((c) => ({
        name: c.name,
        type: c.type,
        position: {
            x: Number(c.position.x.toFixed(3)),
            y: Number(c.position.y.toFixed(3)),
            z: Number(c.position.z.toFixed(3)),
        },
        rotation: {
            x: Number(c.rotation.x.toFixed(3)),
            y: Number(c.rotation.y.toFixed(3)),
            z: Number(c.rotation.z.toFixed(3)),
        },
        scale: {
            x: Number(c.scale.x.toFixed(3)),
            y: Number(c.scale.y.toFixed(3)),
            z: Number(c.scale.z.toFixed(3)),
        },
    }));

    console.log(`[${label}] root children`, childrenInfo);
}

function debugGeometryStats(label, obj) {
    if (!obj) {
        console.log(`[${label}] no object`);
        return;
    }

    let meshCount = 0;
    let vertexCount = 0;
    let triangleCount = 0;

    obj.traverse((child) => {
        if (!child.isMesh || !child.geometry) return;
        meshCount++;
        const geom = child.geometry;
        const pos = geom.attributes?.position;

        if (pos) {
            vertexCount += pos.count;
        }

        if (geom.index) {
            triangleCount += geom.index.count / 3;
        } else if (pos) {
            triangleCount += pos.count / 3;
        }
    });

    console.log(`[${label}] geometry`, {
        meshCount,
        vertexCount,
        triangleCount: Number(triangleCount.toFixed(3)),
    });
}

function debugFullObject(label, obj) {
    debugObjectAlignment(label, obj);
    debugRootChildren(label, obj);
    debugGeometryStats(label, obj);
}

const DISPOSAL_BATCH_SIZE = 8;
const DEFAULT_VARIANT_CACHE_POLICY = Object.freeze({
    decodedLimit: 0,
    allowBytePrefetch: false,
    disposeOldVariant: false,
});

function queueTextureDisposal(texture, jobs, disposedTextures) {
    if (!texture?.isTexture || disposedTextures.has(texture)) return;

    disposedTextures.add(texture);
    jobs.push(() => texture.dispose());
}

function queueMaterialDisposal(material, jobs, disposedMaterials, disposedTextures) {
    if (!material || disposedMaterials.has(material)) return;

    for (const value of Object.values(material)) {
        queueTextureDisposal(value, jobs, disposedTextures);
    }

    for (const uniform of Object.values(material.uniforms ?? {})) {
        queueTextureDisposal(uniform?.value, jobs, disposedTextures);
    }

    disposedMaterials.add(material);
    jobs.push(() => material.dispose?.());
}

function createObjectDisposeJobs(object) {
    const disposedGeometries = new Set();
    const disposedMaterials = new Set();
    const disposedTextures = new Set();
    const jobs = [];

    object?.traverse((child) => {
        if (!child?.isMesh) return;

        if (child.geometry && !disposedGeometries.has(child.geometry)) {
            disposedGeometries.add(child.geometry);
            jobs.push(() => child.geometry.dispose());
        }

        if (Array.isArray(child.material)) {
            for (const material of child.material) {
                queueMaterialDisposal(material, jobs, disposedMaterials, disposedTextures);
            }
        } else {
            queueMaterialDisposal(child.material, jobs, disposedMaterials, disposedTextures);
        }
    });

    return {
        jobs,
        counts: {
            geometries: disposedGeometries.size,
            materials: disposedMaterials.size,
            textures: disposedTextures.size,
        },
    };
}

function requestDeferredWork(callback) {
    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(callback, { timeout: 1000 });
        return;
    }

    setTimeout(() => callback({ timeRemaining: () => 8 }), 120);
}

function scheduleObjectDisposal(object, meta = {}) {
    if (!object) return null;

    if (!object.userData) object.userData = {};
    if (object.userData.disposalQueued) return null;
    object.userData.disposalQueued = true;

    const { jobs, counts } = createObjectDisposeJobs(object);

    console.log("[LOD DISPOSE QUEUED]", {
        ...meta,
        ...counts,
        jobs: jobs.length,
    });

    if (jobs.length === 0) return counts;

    function runBatch(deadline) {
        let disposedThisBatch = 0;

        while (
            jobs.length > 0 &&
            disposedThisBatch < DISPOSAL_BATCH_SIZE &&
            (
                disposedThisBatch === 0 ||
                !deadline?.timeRemaining ||
                deadline.timeRemaining() > 2
            )
        ) {
            const job = jobs.shift();
            job();
            disposedThisBatch += 1;
        }

        if (jobs.length > 0) {
            requestDeferredWork(runBatch);
            return;
        }

        console.log("[LOD DISPOSE DONE]", {
            ...meta,
            ...counts,
        });
    }

    requestDeferredWork(runBatch);
    return counts;
}

export class Asset extends SceneElementInterface {
    object;
    id;

    sourceUrl;
    simplifiedUrl;

    position;
    rotation;
    scale;
    name;

    animations;
    animationMixer;
    activeAnimation;
    playingAction;
    #error;

    highlight;
    hidden;

    constructor(assetData) {
        super();
        this.id = assetData.id;

        this.sourceUrl = assetData.url;
        this.simplifiedUrl = assetData.simplifiedUrl ?? null;

        this.name = assetData.name != null ? assetData.name : assetData.url;
        this.activeAnimation = assetData.activeAnimation || null;

        this.highlight = ref(false);
        this.hidden = ref(false);
        this.animations = reactive([]);

        this.position = safeVec3(assetData.position, { x: 0, y: 0, z: 0 });
        this.rotation = safeVec3(assetData.rotation, { x: 0, y: 0, z: 0 });
        this.scale = safeVec3(assetData.scale, { x: 1, y: 1, z: 1 });

        this.#error = false;

        this.currentVariant = null;
        this.previousVariant = null;
        this.pendingTargetVariant = null;
        this.queuedTargetVariant = null;
        this.isVariantSwapPending = false;
        this.manifestCache = null;
        this.lastDebugTargetVariant = null;
        this.variantCachePolicy = { ...DEFAULT_VARIANT_CACHE_POLICY };
        this.variantObjectCache = new Map();
        this.variantCacheOrder = [];
        this.variantWarmPromises = new Map();
    }

    setVariantCachePolicy(policy = {}) {
        this.variantCachePolicy = {
            ...DEFAULT_VARIANT_CACHE_POLICY,
            ...(policy ?? {}),
        };
        this.enforceVariantCacheLimit();
    }

    getVariantCacheLimit() {
        return Math.max(0, Number(this.variantCachePolicy.decodedLimit) || 0);
    }

    touchCachedVariant(variantKey) {
        this.variantCacheOrder = this.variantCacheOrder.filter((key) => key !== variantKey);
        this.variantCacheOrder.push(variantKey);
    }

    takeCachedVariant(variantKey) {
        const cached = this.variantObjectCache.get(variantKey);
        if (!cached) return null;

        this.variantObjectCache.delete(variantKey);
        this.variantCacheOrder = this.variantCacheOrder.filter((key) => key !== variantKey);

        console.log("[LOD CACHE HIT]", {
            assetId: this.id,
            variant: variantKey,
            cachedVariants: this.variantCacheOrder,
        });

        return cached;
    }

    cacheDetachedVariant(variantKey, object) {
        if (!variantKey || !object || this.getVariantCacheLimit() <= 0) return false;

        if (!object.userData) object.userData = {};
        object.userData.disposalQueued = false;

        const existing = this.variantObjectCache.get(variantKey);
        if (existing && existing !== object) {
            scheduleObjectDisposal(existing, {
                assetId: this.id,
                evicted: true,
                variant: variantKey,
                reason: "replace cached variant",
            });
        }

        this.variantObjectCache.set(variantKey, object);
        this.touchCachedVariant(variantKey);
        this.enforceVariantCacheLimit();

        console.log("[LOD CACHE STORE]", {
            assetId: this.id,
            variant: variantKey,
            decodedLimit: this.getVariantCacheLimit(),
            cachedVariants: this.variantCacheOrder,
        });

        return this.variantObjectCache.has(variantKey);
    }

    enforceVariantCacheLimit() {
        const limit = this.getVariantCacheLimit();

        while (this.variantCacheOrder.length > limit) {
            const evictedKey = this.variantCacheOrder.shift();
            const evictedObject = this.variantObjectCache.get(evictedKey);
            this.variantObjectCache.delete(evictedKey);

            scheduleObjectDisposal(evictedObject, {
                assetId: this.id,
                evicted: true,
                variant: evictedKey,
                decodedLimit: limit,
            });

            console.log("[LOD CACHE EVICT]", {
                assetId: this.id,
                variant: evictedKey,
                decodedLimit: limit,
                cachedVariants: this.variantCacheOrder,
            });
        }
    }

    getWarmVariantKeys() {
        const limit = this.getVariantCacheLimit();
        if (limit <= 0) return [];

        const current = this.currentVariant;
        const priorityByCurrent = {
            original: ["n3", "n2", "n1"],
            n1: ["original", "n3", "n2"],
            n2: ["original", "n3", "n1"],
            n3: ["original", "n2", "n1"],
        };

        return (priorityByCurrent[current] ?? ["original", "n3", "n2", "n1"])
            .filter((variantKey) => variantKey !== current)
            .slice(0, limit);
    }

    async warmVariant(variantKey) {
        if (!variantKey || this.getVariantCacheLimit() <= 0) return false;
        if (variantKey === this.currentVariant) return false;
        if (this.variantObjectCache.has(variantKey)) return true;
        if (this.variantWarmPromises.has(variantKey)) return this.variantWarmPromises.get(variantKey);

        const promise = (async () => {
            try {
                const manager = ObjectManager.getInstance();
                const manifest = await this.getManifest();
                const chosen = pickVariantFromManifest(manifest, {
                    variantOverride: variantKey,
                    allowFallback: false,
                });

                if (!chosen?.path || chosen.variant !== variantKey) return false;
                if (this.currentVariant === variantKey || this.variantObjectCache.has(variantKey)) return true;

                console.log("[LOD CACHE WARM START]", {
                    assetId: this.id,
                    variant: variantKey,
                    decodedLimit: this.getVariantCacheLimit(),
                });

                const loaded = await manager.load(chosen.path);
                const warmedObject = loaded.object ?? loaded;

                if (!warmedObject) return false;
                if (this.currentVariant === variantKey || this.variantObjectCache.has(variantKey)) {
                    scheduleObjectDisposal(warmedObject, {
                        assetId: this.id,
                        discarded: true,
                        variant: variantKey,
                        reason: "warm no longer needed",
                    });
                    return true;
                }

                const cached = this.cacheDetachedVariant(variantKey, warmedObject);

                console.log("[LOD CACHE WARM DONE]", {
                    assetId: this.id,
                    variant: variantKey,
                    cached,
                });

                return cached;
            } catch (e) {
                console.warn("[LOD CACHE WARM FAILED]", {
                    assetId: this.id,
                    variant: variantKey,
                    error: e,
                });
                return false;
            } finally {
                this.variantWarmPromises.delete(variantKey);
            }
        })();

        this.variantWarmPromises.set(variantKey, promise);
        return promise;
    }

    warmLikelyVariants() {
        const variantKeys = this.getWarmVariantKeys();
        if (variantKeys.length === 0) return false;

        requestDeferredWork(() => {
            for (const variantKey of variantKeys) {
                this.warmVariant(variantKey);
            }
        });

        return true;
    }

    async getManifest() {
        if (!this.manifestCache) {
            this.manifestCache = await fetchAssetManifest(this.id);
        }
        return this.manifestCache;
    }

    hasError() {
        return this.#error;
    }

    playAnimation(name) {
        if (!this.animationMixer) return;
        if (!this.object) return;

        if (this.playingAction) {
            this.playingAction.stop();
            this.playingAction = null;
            this.activeAnimation = null;
        }

        if (name) {
            const anim = THREE.AnimationClip.findByName(this.object.animations, name);
            if (!anim) return;

            const action = this.animationMixer.clipAction(anim);
            action.play();
            this.activeAnimation = name;
            this.playingAction = action;
        }
    }
    async preloadVariants() {
        try {
            const manager = ObjectManager.getInstance();
            const manifest = await this.getManifest();

            const variants = manifest?.variants || {};
            const keys = ["original", "n1", "n2", "n3"];

            for (const key of keys) {
                const variant = variants[key];

                if (!variant || variant.status !== "ready" || !variant.path) {
                    continue;
                }

                const path = variant.path.startsWith("/")
                    ? variant.path
                    : `/${variant.path}`;

                await manager.load(path);
            }

            console.log("[Asset] variants preloaded", {
                assetId: this.id,
                assetName: this.name,
            });
        } catch (e) {
            console.warn("[Asset] preloadVariants failed", this.id, e);
        }
    }
    async load(options = {}) {
        try {
            const manager = ObjectManager.getInstance();

            const manifest = await this.getManifest();
            const chosen = pickVariantFromManifest(manifest, options);

            this.currentVariant = chosen?.variant ?? null;

            console.log("[INITIAL LOAD]",
                "asset:", this.id,
                "preferredVariant:", manifest?.preferredVariant,
                "chosenVariant:", chosen?.variant,
                "path:", chosen?.path
            );

            const urlToLoad = chosen?.path;
            if (!urlToLoad || typeof urlToLoad !== "string") {
                throw new Error(`[Asset.load] invalid urlToLoad: ${urlToLoad}`);
            }

            const loaded = await manager.load(urlToLoad);

            this.#error = typeof loaded.hasError === "function" ? loaded.hasError() : false;

            const loadedObject = loaded.object ?? loaded;
            if (!loadedObject) {
                throw new Error("[Asset.load] loadedObject is null");
            }

            this.object = loadedObject;
            this.mesh = loadedObject;

            this.object.userData.assetId = this.id;

            if (!isValidVec3(this.position)) {
                console.warn("[Asset.load] invalid position, fallback to 0", {
                    assetId: this.id,
                    position: this.position,
                });
                this.position = { x: 0, y: 0, z: 0 };
            }

            if (!isValidVec3(this.rotation)) {
                console.warn("[Asset.load] invalid rotation, fallback to 0", {
                    assetId: this.id,
                    rotation: this.rotation,
                });
                this.rotation = { x: 0, y: 0, z: 0 };
            }

            if (!isValidVec3(this.scale)) {
                console.warn("[Asset.load] invalid scale, fallback to 1", {
                    assetId: this.id,
                    scale: this.scale,
                });
                this.scale = { x: 1, y: 1, z: 1 };
            }

            this.object.position.set(this.position.x, this.position.y, this.position.z);
            this.object.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
            this.object.scale.set(this.scale.x, this.scale.y, this.scale.z);
            this.object.castShadow = true;
            this.object.receiveShadow = true;
            this.object.isAsset = true;

            this.object.updateMatrixWorld(true);

            const box = new THREE.Box3().setFromObject(this.object);

            /* tried to fix model of woman position
            if(!box.isEmpty() && Number.isFinite(box.min.y)) {
                this.object.positiony -= box.min.y;
                this.object.updateMatrixWorld(true);
            }*/


            const center = new THREE.Vector3();
            const worldPos = new THREE.Vector3();

            box.getCenter(center);
            this.object.getWorldPosition(worldPos);

            console.log("[ASSET HEIGHT DEBUG]", this.name, {
                rootY: this.object.position.y,
                worldY: worldPos.y,
                bboxMinY: box.min.y,
                bboxMaxY: box.max.y,
                bboxCenterY: center.y,
                offsetFromRootToBottom: box.min.y - worldPos.y,
            });
            //debugFullObject(`INITIAL ${chosen?.variant ?? "unknown"}`, this.object);

            if (this.object?.animations?.length > 0) {
                this.animationMixer = new THREE.AnimationMixer(this.object);
                this.animations.length = 0;

                for (const animation of this.object.animations) {
                    this.animations.push(animation.name);
                }

                if (this.activeAnimation) {
                    const anim = THREE.AnimationClip.findByName(this.object.animations, this.activeAnimation);
                    if (anim) {
                        const action = this.animationMixer.clipAction(anim);
                        action.play();
                        this.playingAction = action;
                    }
                }
            }

            return this.object;
        } catch (e) {
            console.error("[Asset.load] failed", this.id, e);
            this.#error = true;
            return null;
        }
    }
    async prefetchVariantFile(variantKey) {
        try {
            const manifest = await this.getManifest();
            const variant = manifest?.variants?.[variantKey];

            if (!variant || variant.status !== "ready" || !variant.path) return;

            const path = variant.path.startsWith("/")
                ? variant.path
                : `/${variant.path}`;

            await fetch(getResource(path), {
                cache: "force-cache",
            });
        } catch (e) {
            console.warn("[Asset] prefetchVariantFile failed", {
                assetId: this.id,
                variantKey,
                error: e,
            });
        }
    }
    async swapToVariant(scene, variantOverride) {
        try {
            const manager = ObjectManager.getInstance();
            const manifest = await this.getManifest();

            const chosen = pickVariantFromManifest(manifest, {
                variantOverride,
                allowFallback: true,
            });

            if (!chosen?.path) return;
            if (this.currentVariant === chosen.variant) return;
            if (!this.variantObjectCache.has(chosen.variant) && this.variantWarmPromises.has(chosen.variant)) {
                await this.variantWarmPromises.get(chosen.variant);
            }

            const cachedObject = this.takeCachedVariant(chosen.variant);
            const loaded = cachedObject ? null : await manager.load(chosen.path);
            const newObject = cachedObject ?? loaded.object ?? loaded;

            if (!newObject) return;

            if (this.queuedTargetVariant && this.queuedTargetVariant !== chosen.variant) {
                scheduleObjectDisposal(newObject, {
                    assetId: this.id,
                    discarded: true,
                    requested: chosen.variant,
                    queued: this.queuedTargetVariant,
                });

                console.log("[LOD SWAP STALE]", {
                    assetId: this.id,
                    current: this.currentVariant,
                    requested: chosen.variant,
                    queued: this.queuedTargetVariant,
                });

                return;
            }

            newObject.userData.assetId = this.id;

            // 1. Preserve current transform from the scene (avoids jumping)
            if (this.object) {
                newObject.position.copy(this.object.position);
                newObject.quaternion.copy(this.object.quaternion);
                newObject.scale.copy(this.object.scale);
            } else {
                newObject.position.set(this.position.x, this.position.y, this.position.z);
                newObject.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
                newObject.scale.set(this.scale.x, this.scale.y, this.scale.z);
            }

            newObject.castShadow = true;
            newObject.receiveShadow = true;
            newObject.isAsset = true;

            const parent = this.object?.parent ?? scene;
            const oldObject = this.object;
            const oldVariant = this.currentVariant;

            // 2. Clean up old object to free memory and prevent site from closing/crashing
            if (oldObject) {
                if (oldObject.parent) {
                    oldObject.parent.remove(oldObject);
                }

                const cachedOldObject = this.cacheDetachedVariant(oldVariant, oldObject);

                if (!cachedOldObject && this.variantCachePolicy.disposeOldVariant) {
                    scheduleObjectDisposal(oldObject, {
                        assetId: this.id,
                        from: oldVariant,
                        to: chosen.variant,
                        decodedLimit: this.variantCachePolicy.decodedLimit,
                    });
                }
            }

            this.previousVariant = this.currentVariant;
            this.object = newObject;
            this.mesh = newObject;
            this.currentVariant = chosen.variant;
            applyVariantDebugColor(newObject, this.currentVariant);

            if (parent) {
                parent.add(newObject);
            }
            newObject.updateMatrixWorld(true);
            this.warmLikelyVariants();
        } catch (e) {
            console.error("[Asset.swapToVariant] failed", this.id, variantOverride, e);
        }
    }

    pushToScene(scene) {
        if (!this.object) return false;
        scene.add(this.object);
        return true;
    }
}
