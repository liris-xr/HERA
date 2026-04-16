import { computed, shallowReactive } from "vue";
import { MeshManager } from "@/js/threeExt/modelManagement/meshManager.js";
import { MeshLoadError } from "@/js/threeExt/error/meshLoadError.js";
import * as THREE from "three";
import { Vector3 } from "three";
import { runLinearGraph } from "@/js/threeExt/graph/graphRuntime.js";
import { createDefaultAssetGraph } from "@/js/threeExt/graph/defaultAssetGraph.js";
import { defaultResourceLoader } from "@/js/threeExt/graph/resourceLoader.js";

let currentAssetId = 0;

export class AssetManager {
    #assets;
    sceneTitle;
    projectId;
    meshManagerMap;
    meshDataMap;
    onChanged;
    onMoved;

    constructor() {
        this.#assets = shallowReactive([]);
        this.meshManagerMap = new Map();
        this.meshDataMap = new Map();
    }

    setProjectId(id) { this.projectId = id; }
    setSceneTitle(title) { this.sceneTitle = title; }
    setMeshMap(meshDataMap) { this.meshDataMap = meshDataMap; }

    setMeshMapWithData(meshData) {
        meshData.forEach((mesh) => {
            if (this.meshDataMap.get(mesh.assetId)) this.meshDataMap.get(mesh.assetId)[mesh.id] = mesh;
            else this.meshDataMap.set(mesh.assetId, { [mesh.id]: mesh });
        });
    }

    getAssets = computed(() => this.#assets);
    hasAssets = computed(() => this.#assets.length > 0);

    updateAssetSubMeshes(assetData, meshManager, scene) {
        const step = (child, transform) => {
            if (!child?.children) return;

            for (const children of child.children) {
                if ("material" in children) {
                    children.applyMatrix4(transform);

                    children.userData = children.userData ?? {};
                    children.userData.assetId = assetData.id;

                    const subMeshId = `project-${this.projectId}-scene-${this.sceneTitle}-asset-${assetData.id}-mesh-${children.name}`;
                    children.userData.id = subMeshId;

                    const subMeshData = this.meshDataMap.get(assetData.id)?.[subMeshId];
                    meshManager.addSubMesh(scene, children, subMeshData);
                } else {
                    step(children, transform);
                }
            }
        };

        const root = assetData.object ?? assetData.mesh;
        if (root) step(root, new THREE.Matrix4());
    }

    addToScene(scene, asset, onAdd, decomposeMesh = true, options = {}) {
        if (!asset.id) asset.id = "new-asset" + currentAssetId++;
        console.log("[addToScene] asset.id =", asset.id);
        console.log("[addToScene] options =", options);
        console.log("[addToScene] token present =", !!options?.token);
        if (!this.meshManagerMap.has(asset.id)) {
            this.meshManagerMap.set(asset.id, new MeshManager());
        }

        if (!this.#assets.find(a => a.id === asset.id)) {
            this.#assets.push(asset);
            this.runOnChanged();
        }

        const ctx = { scene, asset, onAdd, options: { ...options }, services: {resourceLoader: defaultResourceLoader,}, };

        return runLinearGraph(ctx, createDefaultAssetGraph())
            .then(() => {
                if (decomposeMesh) {
                    this.updateAssetSubMeshes(asset, this.meshManagerMap.get(asset.id), scene);
                }
                if (onAdd) onAdd(asset);
                return asset;
            })
            .catch((e) => {
                console.error("[addToScene] failed", e);
                scene.appendError(new MeshLoadError(asset.sourceUrl));
                return null;
            });
    }

    async reloadAndSwap(scene, asset, options = {}) {
        if (!asset) return false;

        const currentSelected = scene?.getSelected?.();
        const wasAssetSelected = currentSelected === asset;
        const wasSubMeshSelected = currentSelected?.userData?.assetId === asset.id;
        const shouldClearSelection = wasAssetSelected || wasSubMeshSelected;

        if (shouldClearSelection) {
            scene?.setSelected?.(null);
        }

        const oldObj = asset.getObject?.() ?? asset.object ?? asset.mesh ?? null;

        if (oldObj) {
            scene.remove(oldObj);

            oldObj.traverse((obj) => {
                if (!obj) return;

                if (obj.geometry) obj.geometry.dispose?.();

                const mat = obj.material;
                if (Array.isArray(mat)) {
                    mat.forEach((m) => m?.dispose?.());
                } else {
                    mat?.dispose?.();
                }
            });
        }

        // Important: kill stale references before reload
        asset.object = null;
        asset.mesh = null;

        this.meshManagerMap.delete(asset.id);
        this.meshManagerMap.set(asset.id, new MeshManager());

        const ctx = { scene, asset, onAdd: null, options: { ...options } };

        try {
            await runLinearGraph(ctx, createDefaultAssetGraph());

            const newRoot = asset.getObject?.() ?? asset.object ?? asset.mesh ?? null;
            if (!newRoot) {
                throw new Error("[reloadAndSwap] new asset root missing after graph run");
            }

            this.updateAssetSubMeshes(asset, this.meshManagerMap.get(asset.id), scene);

            if (wasAssetSelected) {
                scene?.setSelected?.(asset);
            } else {
                scene?.setSelected?.(null);
            }

            this.runOnChanged();
            return true;
        } catch (e) {
            console.error("[reloadAndSwap] failed", e);
            scene.appendError(new MeshLoadError(asset.sourceUrl));
            scene?.setSelected?.(null);
            return false;
        }
    }

    removeFromScene(scene, asset) {
        const idx = this.#assets.findIndex(a => a.id === asset.id);
        if (idx === -1) return false;

        const currentAsset = this.#assets[idx];
        this.#assets.splice(idx, 1);
        this.runOnChanged();

        const root = currentAsset.getObject?.() ?? currentAsset.object ?? currentAsset.mesh ?? null;
        if (root) scene.remove(root);

        this.meshManagerMap.delete(asset.id);
        return true;
    }

    getResultMeshes() {
        const result = [];
        const seen = new Set();

        this.meshManagerMap.forEach((meshManager, assetId) => {
            const meshes = meshManager?.getMeshes?.value ?? [];
            for (const mesh of meshes) {
                if (!mesh) continue;

                const finalAssetId = mesh?.userData?.assetId ?? assetId;
                if (!finalAssetId) continue;

                const name = mesh?.name ?? "mesh";
                const meshId =
                    mesh?.userData?.id ??
                    `project-${this.projectId}-scene-${this.sceneTitle}-asset-${finalAssetId}-mesh-${name}`;

                const key = `${meshId}::${finalAssetId}`;
                if (seen.has(key)) continue;
                seen.add(key);

                const pos = mesh.position ?? { x: 0, y: 0, z: 0 };
                const rot = mesh.rotation ?? { x: 0, y: 0, z: 0 };
                const scl = mesh.scale ?? { x: 1, y: 1, z: 1 };
                const md = mesh?.userData?.materialData ?? {};

                result.push({
                    id: meshId,
                    assetId: finalAssetId,
                    name,
                    position: { x: pos.x, y: pos.y, z: pos.z },
                    rotation: { x: rot.x, y: rot.y, z: rot.z },
                    scale: { x: scl.x, y: scl.y, z: scl.z },
                    color: md.color ?? "#ffffff",
                    emissive: md.emissive ?? "#000000",
                    emissiveIntensity: md.emissiveIntensity ?? 0,
                    roughness: md.roughness ?? 1,
                    metalness: md.metalness ?? 0,
                    opacity: md.opacity ?? 1,
                });
            }
        });

        return result;
    }

    getResultAssets() {
        const result = [];
        for (const asset of this.#assets) {
            if (asset.id === "vrCamera") continue;

            const preferredVariant =
                (asset.preferredVariant?.value ?? asset.preferredVariant ?? "original");

            const simplifyRatio =
                (asset.simplifyRatio?.value ?? asset.simplifyRatio ?? null);

            result.push({
                id: asset.id,
                name: asset.name,
                position: asset.getResultPosition(),
                rotation: asset.getResultRotation(),
                scale: asset.getResultScale(),
                hideInViewer: asset.hideInViewer.value,
                copiedUrl: asset?.copiedUrl,
                activeAnimation: asset.activeAnimation,
                preferredVariant,
                simplifyRatio,
            });
        }
        return result;
    }

    runOnChanged() {
        if (this.onChanged) this.onChanged();
        if (this.onMoved) this.onMoved();
    }

    getSceneBoundingBox() {
        const boundingGroup = [];

        this.meshManagerMap.forEach((meshManager) => {
            for (const mesh of meshManager.getMeshes.value) {
                if (!mesh) continue;
                const meshBoundingBox = new THREE.Box3().setFromObject(mesh);
                boundingGroup.push(meshBoundingBox);
            }
        });

        let vMin = new Vector3(0, 0, 0);
        let vMax = new Vector3(0, 0, 0);

        for (const boundingBox of boundingGroup) {
            vMin.min(boundingBox.min);
            vMax.max(boundingBox.max);
        }

        return new THREE.Box3(vMin, vMax);
    }

    getResultUploads() {
        const uploads = [];
        for (const asset of this.#assets) {
            if (asset?.uploadData) uploads.push(asset.uploadData);
        }
        return uploads;
    }

    setUploaded(dbAssets, assetsIdMatching) {
        const map = new Map((assetsIdMatching ?? []).map(m => [m.tempId, m.newId]));

        for (const asset of this.#assets) {
            const oldId = asset.id;
            const newId = map.get(oldId);
            if (!newId) continue;

            if (this.meshManagerMap.has(oldId)) {
                const mm = this.meshManagerMap.get(oldId);
                this.meshManagerMap.delete(oldId);
                this.meshManagerMap.set(newId, mm);
            }

            if (this.meshDataMap.has(oldId)) {
                const md = this.meshDataMap.get(oldId);
                this.meshDataMap.delete(oldId);
                this.meshDataMap.set(newId, md);
            }

            asset.id = newId;
        }

        for (const [oldId, newId] of map.entries()) {
            const mm = this.meshManagerMap.get(newId);
            if (!mm) continue;

            const meshes = mm.getMeshes?.value ?? [];
            for (const mesh of meshes) {
                if (mesh?.userData?.assetId === oldId) mesh.userData.assetId = newId;
                if (typeof mesh?.userData?.id === "string" && mesh.userData.id.includes(`-asset-${oldId}-`)) {
                    mesh.userData.id = mesh.userData.id.replace(`-asset-${oldId}-`, `-asset-${newId}-`);
                }
            }
        }

        const dbMap = new Map((dbAssets ?? []).map(a => [a.id, a]));
        for (const asset of this.#assets) {
            const db = dbMap.get(asset.id);
            if (!db) continue;

            asset.__originalSourceUrl = db.url ?? asset.__originalSourceUrl ?? asset.sourceUrl;
            asset.sourceUrl = asset.__originalSourceUrl;
            asset.simplifiedUrl = db.simplifiedUrl ?? asset.simplifiedUrl ?? null;
            asset.preferredVariant = db.preferredVariant ?? asset.preferredVariant ?? "original";
            asset.simplifyRatio = db.simplifyRatio ?? asset.simplifyRatio ?? null;

            if (asset.uploadData) asset.uploadData = null;
        }

        this.runOnChanged();
    }
}