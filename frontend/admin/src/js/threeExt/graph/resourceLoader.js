import { Mesh } from "@/js/threeExt/modelManagement/mesh.js";

export class ResourceLoader {
    async load({ asset, url, fromUpload }) {
        if (!asset) {
            throw new Error("[ResourceLoader] Missing asset.");
        }

        asset.setLoading?.(true);
        asset.setHasError?.(false);

        try {
            let meshLoader;

            if (fromUpload && asset.uploadData) {
                meshLoader = new Mesh(null, asset.uploadData);
            } else {
                const finalUrl = url ?? asset.sourceUrl;
                if (!finalUrl) {
                    throw new Error("[ResourceLoader] No URL to load.");
                }
                meshLoader = new Mesh(finalUrl, null);
            }

            const object3D = await meshLoader.load();

            object3D.position.set(
                asset.position.x,
                asset.position.y,
                asset.position.z
            );

            object3D.rotation.set(
                asset.rotation.x,
                asset.rotation.y,
                asset.rotation.z
            );

            object3D.scale.set(
                asset.scale.x,
                asset.scale.y,
                asset.scale.z
            );

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