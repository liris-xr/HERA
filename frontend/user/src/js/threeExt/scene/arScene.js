import * as THREE from "three";
import {Asset} from "@/js/threeExt/modelManagement/asset.js";
import {computed, shallowReactive} from "vue";
import {ArMeshLoadError} from "@/js/threeExt/error/arMeshLoadError.js";
import {ShadowPlane} from "@/js/threeExt/lighting/shadowPlane.js";
import {AbstractScene} from "@/js/threeExt/scene/abstractScene.js";
import {LabelPlayer} from "@/js/threeExt/postProcessing/labelPlayer.js";
import {EmptyAsset} from "@/js/threeExt/modelManagement/emptyAsset.js";
import {EXRLoader} from "three/addons";
import {getResource} from "@/js/endpoints.js";
import { MeshManager } from "../modelManagement/meshManager";
import {buildAssetRuntimeMetrics} from "@/js/threeExt/runtimeLod/runtimeMetrics.js";
import {selectAssetVariant} from "@/js/threeExt/runtimeLod/variantSelector.js";
import {ensureAssetVariant} from "@/js/threeExt/runtimeLod/variantApplier.js";

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
    sceneId
    title;
    description;
    #assets
    meshDataMap // Mesh data from the database
    labelPlayer;
    #shadowPlane
    #errors;
    #boundingSphere
    #boundingBox;
    clock
    vrStartPosition

    constructor(sceneData) {
        super();
        this.sceneId = sceneData.id;
        this.title = sceneData.title;
        this.description = sceneData.description;
        this.#assets = [];
        this.meshDataMap = new Map();
        this.meshManager = new MeshManager()
        this.vrStartPosition = sceneData?.vrStartPosition

        for (let assetData of sceneData.assets) {
            this.#assets.push(new Asset(assetData));
        }

        for (let meshData of sceneData.meshes) {
            this.meshDataMap.set(meshData.name,meshData)
        }

        if(this.#assets.length == 0) this.#assets.push(new EmptyAsset())

        this.labelPlayer = new LabelPlayer();
        for (let labelData of sceneData.labels) {
            this.labelPlayer.addToScene(this,labelData);
        }

        this.#errors = [];
        this.#boundingSphere = null;
        this.#boundingBox = null;

        if(sceneData.envmapUrl)
            this.environment = new EXRLoader()
                .load(getResource(sceneData.envmapUrl), (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping

                    // this.background = texture
                })

        this.clock = new THREE.Clock();

        this._lastVariantUpdateTime = 0;
        this._variantUpdateIntervalMs = 100;
        this._lodConfig = {
            originalMin: 0.20,
            n1Min: 0.10,
            n2Min: 0.04,
            hysteresis: 0.01,
        };
        this.debugLod = {distance: null, current: null, target: null };
        this.devicePolicy = null;
    }

    //sub mesh helpers

    getAssetSubMeshes(assetData) {
        let subMeshes = []
        //console.log(assetData);

        const step = (child,transform) => {
            for(let children of child.children) {
                if ("material" in children) {
                    children.applyMatrix4(transform)
                    subMeshes.push(children)
                } else {
                    let newTransform = new THREE.Matrix4()
                    step(children,newTransform.multiplyMatrices(transform,children.matrix))
                }

            }
        }
        if(assetData.object) {
            step(assetData.object,new THREE.Matrix4())
        } else {
            subMeshes.push(assetData.mesh)
        }

        return subMeshes
    }

    //walks the asset's object graph and applies data based sourced overrides to each sub mesh then refreshes normals
    //called after initial load and after every lod variant swpa to keep the sub mesh config consistent across model changes
    updateAssetSubMeshes(assetData) {
        const step = (child,transform) => {
            for(let children of child.children) {
                if ("material" in children) {
                    //children.applyMatrix4(transform)
                    const subMeshData = this.meshDataMap.get(children.name)
                    this.meshManager.updateSubMesh(children,subMeshData)
                    children.updateMatrixWorld()
                    children.geometry.computeVertexNormals()
                } else {
                    let newTransform = new THREE.Matrix4()
                    step(children,newTransform.multiplyMatrices(transform,children.matrix))
                }
            }
        }
        if(assetData.object) {
            step(assetData.object,new THREE.Matrix4())
        }
    }

    async init(){
        for (let assetData of this.#assets) {
            await assetData.load();

            if (assetData.hasError() || !assetData.object) {
                this.#errors.push(new ArMeshLoadError(assetData.sourceUrl));
                console.error(`[ArScene] Failed to load asset: ${assetData.sourceUrl}`);
                continue;
            }

            this.updateAssetSubMeshes(assetData);
            this.add(assetData.object);
        }

        this.computeBoundingSphere(true);
        this.#shadowPlane = new ShadowPlane(this.computeBoundingBox(false));
        this.#shadowPlane.pushToScene(this);
    }

    getErrors = computed(()=>{
        return this.#errors;
    })

    hasDescription(){
        return this.description  != null && this.description.trim().length>0
    }

    hasLabels = computed(()=>{
        return this.labelPlayer.hasLabels.value;
    })

    hasAnimation = computed(()=>{
        return this.hasLabels.value && this.labelPlayer.getDuration()>0;
    })

    resetLabels = ()=>{
        this.labelPlayer.reset();
    }


    computeBoundingBox(forceCompute = false){
        if(forceCompute || this.#boundingBox==null){
            const group = new THREE.Group();
            for (let asset of this.#assets) {
                if (!asset?.object) continue;
                group.add(asset.object.clone());
            }
            this.#boundingBox = new THREE.Box3().setFromObject(group);
        }
        return this.#boundingBox;
    }

    computeBoundingSphere(forceCompute = false) {
        if(forceCompute || this.#boundingSphere==null){
            const center = new THREE.Vector3();
            this.computeBoundingBox(forceCompute).getCenter(center);
            this.#boundingSphere = this.computeBoundingBox().getBoundingSphere(new THREE.Sphere(center));
        }
        return this.#boundingSphere;
    }

    //boucle de rendu xr
    async onXrFrame(time, frame, localReferenceSpace, worldTransformMatrix, camera, renderer) {
        //console.log("[ArScene.onXrFrame", this.sceneId);

        worldTransformMatrix.decompose(this.position, this.quaternion, this.scale);
        let el = document.getElementById("placement-debug-overlay");
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
            console.log("[AR SCENE MOVE]",
                "sceneId:", this.sceneId,
                "position:", {
                    x: Number(this.position.x.toFixed(3)),
                    y: Number(this.position.y.toFixed(3)),
                    z: Number(this.position.z.toFixed(3)),
                },
                "delta:", Number(sceneMove.toFixed(4))
            );

            this._lastSceneDebugPos.copy(this.position);
        }
        // animation
        const delta = this.clock.getDelta()
        for (let asset of this.#assets)
            if (asset.animationMixer)
                asset.animationMixer.update(delta)

        const now = performance.now();
        this.labelPlayer.onXrFrame(time, frame, localReferenceSpace, worldTransformMatrix, camera, renderer);

        if (now - this._lastVariantUpdateTime >= this._variantUpdateIntervalMs) {

            this._lastVariantUpdateTime = now;

            for (const asset of this.#assets) {
                if (!asset?.object) continue;
                if (asset instanceof EmptyAsset) continue;

                try {
                    const manifest = await asset.getManifest().catch(() => null);
                    if (!manifest) continue;
                    //calcul métriques runtime
                    const metrics = buildAssetRuntimeMetrics(asset, camera, renderer);
                    //console.log("METRICS", metrics);
                    const targetVariant = selectAssetVariant(manifest, metrics, this._lodConfig,asset.currentVariant);

                    asset.debugLod = {
                        depth: Number((metrics.cameraDepth ?? Infinity).toFixed(2)),
                        visibleCoverage: Number((metrics.visibleCoverage ?? 0).toFixed(4)),
                        widthPx: Number((metrics.screenWidthPx ?? 0).toFixed(0)),
                        heightPx: Number((metrics.screenHeightPx ?? 0).toFixed(0)),
                        sphereRadius: Number((metrics.sphereRadius ?? 0).toFixed(3)),
                        isBehindCamera: !!metrics.isBehindCamera,
                        current: asset.currentVariant,
                        target: targetVariant,
                    };

                    if (this.#assets[0] === asset) {
                        const overlay = ensureLodDebugOverlay();

                        const colorMap = {
                            original: "rgba(46, 204, 113, 0.9)",
                            n1: "rgba(241, 196, 15, 0.9)",
                            n2: "rgba(230, 126, 34, 0.9)",
                            n3: "rgba(231, 76, 60, 0.9)",
                            simplified: "rgba(52, 152, 219, 0.9)"
                        };

                        overlay.style.background = colorMap[targetVariant] || "rgba(0,0,0,0.8)";
                        overlay.innerHTML = [
                            `depth: ${(metrics.cameraDepth ?? Infinity).toFixed(2)}`,
                            `visCover: ${((metrics.visibleCoverage ?? 0) * 100).toFixed(1)}%`,
                            `hVis: ${((metrics.visibleHeightRatio ?? 0) * 100).toFixed(1)}%`,
                            `wVis: ${((metrics.visibleWidthRatio ?? 0) * 100).toFixed(1)}%`,
                            `hPx: ${(metrics.screenHeightPx ?? 0).toFixed(0)}px`,
                            `wPx: ${(metrics.screenWidthPx ?? 0).toFixed(0)}px`,
                            `sphereR: ${(metrics.sphereRadius ?? 0).toFixed(3)}`,
                            `behind: ${metrics.isBehindCamera ? "yes" : "no"}`,
                            `current: ${asset.currentVariant ?? "-"}`,
                            `target: ${targetVariant ?? "-"}`,
                        ].join("<br>");
                    }

                    if (asset.lastDebugTargetVariant !== targetVariant) {
                        console.log("[LOD CHANGE]",
                            "asset:", asset.id,
                            "depth:", Number((metrics.cameraDepth ?? Infinity).toFixed(2)),
                            "visibleCoverage:", Number((metrics.visibleCoverage ?? 0).toFixed(4)),
                            "widthPx:", Number((metrics.screenWidthPx ?? 0).toFixed(0)),
                            "heightPx:", Number((metrics.screenHeightPx ?? 0).toFixed(0)),
                            "sphereRadius:", Number((metrics.sphereRadius ?? 0).toFixed(3)),
                            "isBehindCamera:", !!metrics.isBehindCamera,
                            "current:", asset.currentVariant,
                            "target:", targetVariant
                        );
                        asset.lastDebugTargetVariant = targetVariant;
                    }

                    //await ensureAssetVariant(asset, this, targetVariant);
                    const changed = await ensureAssetVariant(asset, this, targetVariant);
                    if (changed) {
                        this.postSwapAssetUpdate(asset);

                        const obj = asset.object;

                        console.log("[LOD SWAP]",
                            "asset:", asset.id,
                            "from:", asset.previousVariant,
                            "to:", targetVariant,
                            "localPos:", obj ? {
                                x: obj.position.x.toFixed(2),
                                y: obj.position.y.toFixed(2),
                                z: obj.position.z.toFixed(2),
                            } : null
                        );
                    }

                } catch (e) {
                    console.error("[LOD LOOP ERROR]", asset?.id, e);
                }
            }
        }
        //console.log("[OnXRFrame] called");
    }

    hasAssets() {
        return !(this.#assets.length === 0 || this.#assets[0] instanceof EmptyAsset)
    }

    getAssets() {
        return shallowReactive(this.#assets)
    }

    findAssetById(id) {
        for(const asset of this.#assets)
            if(asset.id === id)
                return asset
        return null
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
