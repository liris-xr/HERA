import { getResource } from "@/js/endpoints.js";

export async function loadSparkSplatAsset({ url, name }) {
    const { SplatMesh } = await import("@sparkjsdev/spark");
    const resolvedUrl = getResource(url);

    if (!resolvedUrl) {
        throw new Error("[loadSparkSplatAsset] Missing splat URL.");
    }

    const splat = new SplatMesh({
        url: resolvedUrl,
        fileName: name,
        lod: true,
        raycastable: false,
    });

    splat.name = name || "Gaussian Splat";
    splat.userData.heraAssetKind = "splat";

    await splat.initialized;

    return splat;
}
