import { Mesh } from "@/js/threeExt/modelManagement/mesh.js";

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

const LOADERS_BY_KIND = {
    gltf: loadGltfResource,
    // pointcloud: loadPointcloudResource,
    // splat: loadSplatResource,
};

export class ResourceLoader {
    async load({ asset, url, fromUpload, kind = "gltf" }) {
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

            const object3D = await loader({ asset, url, fromUpload });

            asset.position = safeVec3(asset.position, { x: 0, y: 0, z: 0 });
            asset.rotation = safeVec3(asset.rotation, { x: 0, y: 0, z: 0 });
            asset.scale = safeVec3(asset.scale, { x: 1, y: 1, z: 1 });

            object3D.position.set(asset.position.x, asset.position.y, asset.position.z);
            object3D.rotation.set(asset.rotation.x, asset.rotation.y, asset.rotation.z);
            object3D.scale.set(asset.scale.x, asset.scale.y, asset.scale.z);

            asset.mesh = object3D;
            asset.animations = object3D.animations ?? [];
            asset.markLoaded?.();

            return object3D;
        } catch (e) {
            asset.markLoadFailed?.();
            throw e;
        }
    }
}

export const defaultResourceLoader = new ResourceLoader();
