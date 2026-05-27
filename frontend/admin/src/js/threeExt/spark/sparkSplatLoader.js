import { getResource } from "@/js/endpoints.js";
import { ensureSparkRenderer } from "@/js/threeExt/spark/sparkRuntime.js";

export async function loadSparkSplatResource({ asset, url, fromUpload, ctx }) {
    await ensureSparkRenderer({
        renderer: ctx?.options?.renderer,
        scene: ctx?.scene,
        force: true,
    });

    const { SplatMesh } = await import("@sparkjsdev/spark");
    const options = {
        fileName: asset?.uploadData?.name ?? asset?.name,
        lod: true,
        raycastable: false,
    };

    if (fromUpload && asset?.uploadData) {
        options.fileBytes = await asset.uploadData.arrayBuffer();
    } else {
        const resolvedUrl = getResource(url ?? asset?.sourceUrl);
        if (!resolvedUrl) {
            throw new Error("[loadSparkSplatResource] No URL to load.");
        }
        options.url = resolvedUrl;
    }

    const splat = new SplatMesh(options);
    splat.name = asset?.name || "Gaussian Splat";
    splat.userData.heraAssetKind = "splat";

    await splat.initialized;

    return splat;
}
