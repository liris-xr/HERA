import { Mesh } from "@/js/threeExt/modelManagement/mesh.js";
import { loadSparkSplatResource } from "@/js/threeExt/spark/sparkSplatLoader.js";
import { loadStaticPointCloud } from "@/js/threeExt/pointcloud/staticPointCloud.js";
import { ASSET_KINDS } from "@shared/assetKinds.js";
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

async function loadGltfResource({ asset, url, fromUpload }) {
    let meshLoader;

    if (fromUpload && asset.uploadData) {
        meshLoader = new Mesh(null, asset.uploadData);
    } else {
        const finalUrl = url ?? asset.sourceUrl;
        if (!finalUrl) {
            throw new Error("[loadGltfResource] No URL to load.");
        }
        meshLoader = new Mesh(finalUrl, null);
    }

    return await meshLoader.load();
}

async function loadPointCloudStreamingResource({ asset, url, fromUpload, state }) {
    if (fromUpload) {
        return createPendingPointCloudPlaceholder(asset);
    }

    const finalUrl = url ?? asset.sourceUrl;
    if (!finalUrl) {
        throw new Error("[loadPointCloudStreamingResource] No URL to load.");
    }

    const options = {
        ...(state?.source?.manifest?.lodMeta?.pointCloud ?? {}),
        ...(state?.source?.manifest?.pointCloud ?? {}),
        ...(asset?.pointCloud ?? asset?.pointcloud ?? {}),
    };
    const { loadPotreeStreamingPointCloud } = await import("@/js/threeExt/pointcloud/potreeStreamingPointCloud.js");

    return await loadPotreeStreamingPointCloud({
        url: finalUrl,
        name: asset?.name,
        options,
    });
}

async function loadStaticPointCloudResource({ asset, url, fromUpload, state }) {
    const options = {
        ...(state?.source?.manifest?.lodMeta?.pointCloud ?? {}),
        ...(state?.source?.manifest?.pointCloud ?? {}),
        ...(asset?.pointCloud ?? asset?.pointcloud ?? {}),
    };

    return await loadStaticPointCloud({
        url: fromUpload ? null : (url ?? asset.sourceUrl),
        file: fromUpload ? asset.uploadData : null,
        name: asset?.name,
        options,
    });
}

function createPendingPointCloudPlaceholder(asset) {
    const group = new THREE.Group();
    group.name = asset?.name || "Pending point cloud";
    group.userData.heraAssetKind = ASSET_KINDS.POINTCLOUD_STREAMING;
    group.userData.pendingUpload = true;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
        color: 0x3f8cff,
        opacity: 0.28,
        transparent: true,
        wireframe: true,
    });
    const box = new THREE.Mesh(geometry, material);
    box.name = "pending-pointcloud-placeholder";
    group.add(box);

    group.getBoundingBox = () => new THREE.Box3().setFromObject(group);
    group.dispose = () => {
        geometry.dispose();
        material.dispose();
    };

    return group;
}

function describeTreatment(kind, fromUpload) {
    if (kind === ASSET_KINDS.POINTCLOUD_STREAMING && fromUpload) {
        return "pending-upload-placeholder; backend will store/convert before streaming";
    }
    if (kind === ASSET_KINDS.POINTCLOUD_STREAMING) {
        return "potree-streaming; @pnext/three-loader via shared potreeStreamingCore";
    }
    if (kind === ASSET_KINDS.POINTCLOUD) {
        return fromUpload
            ? "classic-ply-preview; backend converts to Potree streaming on save"
            : "classic-ply-static-preview";
    }
    if (kind === ASSET_KINDS.SPLAT) {
        return "gaussian-splat-loader";
    }
    return "gltf-loader";
}

const LOADERS_BY_KIND = {
    [ASSET_KINDS.GLTF]: loadGltfResource,
    [ASSET_KINDS.SPLAT]: loadSparkSplatResource,
    [ASSET_KINDS.POINTCLOUD]: loadStaticPointCloudResource,
    [ASSET_KINDS.POINTCLOUD_STREAMING]: loadPointCloudStreamingResource,
};

export class ResourceLoader {
    async load({ asset, url, fromUpload, kind = "gltf", state = null, ctx = null }) {
        if (!asset) {
            throw new Error("[ResourceLoader] Missing asset.");
        }

        asset.setLoading?.(true);
        asset.setHasError?.(false);

        try {
            const loader = LOADERS_BY_KIND[kind];
            if (!loader) {
                throw new Error(`[ResourceLoader] Unsupported asset kind: ${kind}`);
            }

            ctx?.services?.logger?.info?.("[ResourceLoader] treatment", {
                assetId: asset.id,
                name: asset.name,
                kind,
                fromUpload: !!fromUpload,
                url: url ?? asset.sourceUrl ?? null,
                reason: ctx?.options?.pipelineReason ?? null,
                treatment: describeTreatment(kind, !!fromUpload),
            });

            const object3D = await loader({ asset, url, fromUpload, kind, state, ctx });

            asset.position = safeVec3(asset.position, { x: 0, y: 0, z: 0 });
            asset.rotation = safeVec3(asset.rotation, { x: 0, y: 0, z: 0 });
            asset.scale = safeVec3(asset.scale, { x: 1, y: 1, z: 1 });

            object3D.position.set(asset.position.x, asset.position.y, asset.position.z);
            object3D.rotation.set(asset.rotation.x, asset.rotation.y, asset.rotation.z);
            object3D.scale.set(asset.scale.x, asset.scale.y, asset.scale.z);

            asset.mesh = object3D;
            asset.kind = kind;
            asset.animations = object3D.animations ?? [];
            asset.markLoaded?.();

            ctx?.services?.logger?.info?.("[ResourceLoader] loaded", {
                assetId: asset.id,
                kind,
                objectType: object3D.type,
                childCount: object3D.children?.length ?? 0,
            });

            return object3D;
        } catch (e) {
            asset.markLoadFailed?.(e);
            throw e;
        }
    }
}

export const defaultResourceLoader = new ResourceLoader();
