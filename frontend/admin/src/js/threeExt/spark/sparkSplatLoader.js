import { getResource } from "@/js/endpoints.js";
import { ensureSparkRenderer } from "@/js/threeExt/spark/sparkRuntime.js";
import { buildSplatDebugPayload, logSplatDebug } from "@shared/splat/splatDiagnostics.js";

export async function loadSparkSplatResource({ asset, url, fromUpload, state, ctx }) {
    const startedAt = performance.now();

    await ensureSparkRenderer({
        renderer: ctx?.options?.renderer,
        scene: ctx?.scene,
        force: true,
    });

    const sparkModule = await import("@sparkjsdev/spark");
    const { SplatMesh } = sparkModule;
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

    logSplatDebug("admin-load-start", buildSplatDebugPayload({
        asset,
        renderer: ctx?.options?.renderer,
        url: options.url ?? asset?.uploadData?.name ?? null,
        options,
        sparkModule,
        manifest: state?.source?.manifest ?? null,
        source: {
            fromUpload: !!fromUpload,
            graphKind: state?.source?.kind ?? null,
        },
    }));

    const splat = new SplatMesh(options);
    splat.name = asset?.name || "Gaussian Splat";
    splat.userData.heraAssetKind = "splat";

    await splat.initialized;

    logSplatDebug("admin-load-end", buildSplatDebugPayload({
        asset,
        object: splat,
        renderer: ctx?.options?.renderer,
        url: options.url ?? asset?.uploadData?.name ?? null,
        options,
        sparkModule,
        manifest: state?.source?.manifest ?? null,
        loadMs: performance.now() - startedAt,
        source: {
            fromUpload: !!fromUpload,
            graphKind: state?.source?.kind ?? null,
        },
    }));

    return splat;
}
