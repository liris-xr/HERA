// resourceLoader.js
// Transitional loader service for HERA.
// Important:
// - for now it still delegates to asset.load()
// - this keeps current behavior stable
// - later you can move real loader logic here progressively

export class ResourceLoader {
    async load({ asset, url, fromUpload }) {
        if (!asset) {
            throw new Error("[ResourceLoader] Missing asset.");
        }

        if (typeof asset.load !== "function") {
            throw new Error("[ResourceLoader] asset.load() is not available.");
        }

        return asset.load({
            urlOverride: url ?? null,
            forceUpload: !!fromUpload,
        });
    }
}

export const defaultResourceLoader = new ResourceLoader();