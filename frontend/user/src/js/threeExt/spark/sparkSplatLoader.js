import { getResource } from "@/js/endpoints.js";
import { buildSplatDebugPayload, logSplatDebug } from "@shared/splat/splatDiagnostics.js";

export async function loadSparkSplatAsset({ url, name, asset = null, manifest = null }) {
    const startedAt = performance.now();
    const sparkModule = await import("@sparkjsdev/spark");
    const { SplatMesh } = sparkModule;
    const resolvedUrl = getResource(url);

    if (!resolvedUrl) {
        throw new Error("[loadSparkSplatAsset] Missing splat URL.");
    }

    const options = {
        url: resolvedUrl,
        fileName: name,
        lod: true,
        raycastable: false,
    };

    logSplatDebug("viewer-load-start", buildSplatDebugPayload({
        asset,
        url: resolvedUrl,
        options,
        sparkModule,
        manifest,
    }));

    const splat = new SplatMesh(options);

    splat.name = name || "Gaussian Splat";
    splat.userData.heraAssetKind = "splat";

    await splat.initialized;

    logSplatDebug("viewer-load-end", buildSplatDebugPayload({
        asset,
        object: splat,
        url: resolvedUrl,
        options,
        sparkModule,
        manifest,
        loadMs: performance.now() - startedAt,
    }));

    return splat;
}
