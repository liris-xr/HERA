import { SceneElementInterface } from "@/js/threeExt/interfaces/sceneElementInterface.js";
import * as THREE from "three";
import { reactive, ref } from "vue";
import { ObjectManager } from "@/js/threeExt/modelManagement/objectManager.js";
import { fetchAssetManifest, pickVariantFromManifest } from "@/js/threeExt/assetManifest.js";

function applyVariantDebugColor(object, variant) {
    const colorMap = {
        original: 0x000000,
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

        this.position = assetData.position ?? { x: 0, y: 0, z: 0 };
        this.rotation = assetData.rotation ?? { x: 0, y: 0, z: 0 };
        this.scale = assetData.scale ?? { x: 1, y: 1, z: 1 };

        this.#error = false;
        this.currentVariant = null;
        this.isVariantSwapPending = false;
        this.manifestCache = null;
        this.lastDebugTargetVariant = null;
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
            debugFullObject(`INITIAL ${chosen?.variant ?? "unknown"}`, this.object);

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
            const loaded = await manager.load(chosen.path);
            const newObject = loaded.object ?? loaded;

            if (!newObject) return;

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

            // 2. Clean up old object to free memory and prevent site from closing/crashing
            if (this.object) {
                if (this.object.parent) {
                    this.object.parent.remove(this.object);
                }
                
                /*this.object.traverse((child) => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });*/
            }

            this.object = newObject;
            this.mesh = newObject;
            this.currentVariant = chosen.variant;
            //applyVariantDebugColor(newObject, this.currentVariant);

            if (parent) {
                parent.add(newObject);
            }
            newObject.updateMatrixWorld(true);
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