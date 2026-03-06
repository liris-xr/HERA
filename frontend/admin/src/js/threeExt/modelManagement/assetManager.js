import { computed, shallowReactive } from "vue";
import { MeshManager } from "@/js/threeExt/modelManagement/meshManager.js";
import { MeshLoadError } from "@/js/threeExt/error/meshLoadError.js";
import * as THREE from "three";
import { Vector3 } from "three";
import { runLinearGraph } from "@/js/threeExt/graph/graphRuntime.js";
import { createDefaultAssetGraph } from "@/js/threeExt/graph/defaultAssetGraph.js";

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
            for (let children of child.children) {
                if ("material" in children) {
                    children.applyMatrix4(transform);

                    children.userData = children.userData ?? {};
                    children.userData.assetId = assetData.id;

                    // stable unique mesh id
                    const subMeshId = `project-${this.projectId}-scene-${this.sceneTitle}-asset-${assetData.id}-mesh-${children.name}`;
                    children.userData.id = subMeshId;

                    const subMeshData = this.meshDataMap.get(assetData.id)?.[subMeshId];
                    this.meshManagerMap.get(assetData.id).addSubMesh(scene, children, subMeshData);
                } else {
                    step(children, transform);
                }
            }
        };

        if (assetData.mesh) step(assetData.mesh, new THREE.Matrix4());
        const root = assetData.object ?? assetData.mesh;
        if (root) step(root, new THREE.Matrix4());
    }

    addToScene(scene, asset, onAdd, decomposeMesh = true, options = {}) {
        if (!asset.id) asset.id = "new-asset" + currentAssetId++;

        if (!this.meshManagerMap.has(asset.id)) {
            this.meshManagerMap.set(asset.id, new MeshManager());
        }

        if (!this.#assets.find(a => a.id === asset.id)) {
            this.#assets.push(asset);
            this.runOnChanged();
        }

        // this.applyVariantToAssetForLoading(asset, options);

        const ctx = { scene, asset, onAdd, options: { ...options } };

        return runLinearGraph(ctx, createDefaultAssetGraph())
            .then(() => {
                if (decomposeMesh) this.updateAssetSubMeshes(asset, this.meshManagerMap.get(asset.id), scene);
                if (onAdd) onAdd(asset);
                return asset;
            })
            .catch(() => {
                scene.appendError(new MeshLoadError(asset.sourceUrl));
            });
    }

    async reloadAndSwap(scene, asset, options = {}) {
        if (!asset) return false;

        const wasSelected = scene?.getSelected?.() === asset;
        if (wasSelected && scene?.transformControls?.detach) {
            scene.transformControls.detach();
        }

        const oldObj = asset.object ?? asset.mesh ?? null;

        if (oldObj) {
            scene.remove(oldObj);

            oldObj.traverse((obj) => {
                if (!obj) return;
                if (obj.geometry) obj.geometry.dispose?.();
                const mat = obj.material;
                if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
                else mat?.dispose?.();
            });
        }

        this.meshManagerMap.delete(asset.id);
        this.meshManagerMap.set(asset.id, new MeshManager());

        //this.applyVariantToAssetForLoading(asset, options);

        const ctx = { scene, asset, onAdd: null, options: { ...options } };

        try {
            await runLinearGraph(ctx, createDefaultAssetGraph());

            asset.mesh = asset.object ?? asset.mesh;

            this.updateAssetSubMeshes(asset, this.meshManagerMap.get(asset.id), scene);

            // re-attach transform controls if needed
            if (wasSelected) {
                scene?.setSelected?.(asset);
                const obj = asset.object ?? asset.mesh;
                if (obj && scene?.transformControls?.attach) {
                    scene.transformControls.attach(obj);
                }
            }

            this.runOnChanged();
            return true;
        } catch (e) {
            console.error("[reloadAndSwap] failed", e);
            scene.appendError(new MeshLoadError(asset.sourceUrl));
            return false;
        }
    }

    removeFromScene(scene, asset) {
        const idx = this.#assets.findIndex(a => a.id === asset.id);
        if (idx === -1) return false;

        const currentAsset = this.#assets[idx];
        this.#assets.splice(idx, 1);
        this.runOnChanged();

        if (currentAsset.mesh) scene.remove(currentAsset.mesh);
        this.meshManagerMap.delete(asset.id);

        return true;
    }

    // ---------------------------
    // Mesh sa
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
        for (let asset of this.#assets) {
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
            for (let mesh of meshManager.getMeshes.value) {
                const meshBoundingBox = new THREE.Box3().setFromObject(mesh);
                boundingGroup.push(meshBoundingBox);
            }
        });

        let vMin = new Vector3(0, 0, 0);
        let vMax = new Vector3(0, 0, 0);
        for (let boundingBox of boundingGroup) {
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

            // store original db url safely
            asset.__originalSourceUrl = db.url ?? asset.__originalSourceUrl ?? asset.sourceUrl;

            // set active sourceUrl = original by default; loader will override when needed
            asset.sourceUrl = asset.__originalSourceUrl;

            asset.simplifiedUrl = db.simplifiedUrl ?? asset.simplifiedUrl ?? null;
            asset.preferredVariant = db.preferredVariant ?? asset.preferredVariant ?? "original";
            asset.simplifyRatio = db.simplifyRatio ?? asset.simplifyRatio ?? null;

            if (asset.uploadData) asset.uploadData = null;
        }

        this.runOnChanged();
    }
}