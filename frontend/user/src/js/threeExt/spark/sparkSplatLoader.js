import { getResource } from "@/js/endpoints.js";
import {
    buildSplatDebugPayload,
    logSplatDebug,
    logSplatSourceDebug,
} from "@shared/splat/splatDiagnostics.js";
import {createModernSpzSparkSplat, shouldUseModernSpzFallback} from "@shared/splat/modernSpzFallback.js";
import {
    buildSparkSplatOptions,
    getOriginalSplatPath,
    getSparkRadSplatPath,
    SPLAT_SOURCE_MODES,
} from "@shared/splat/splatSource.js";

function sourceMessage(mode) {
    if (mode === SPLAT_SOURCE_MODES.RAD_PAGED) return "using paged .rad";
    if (mode === SPLAT_SOURCE_MODES.RAD) return "using .rad";
    return "using original splat quick LoD";
}

async function createSparkSplat({ SplatMesh, options, name, mode }) {
    const splat = new SplatMesh(options);
    splat.name = name || "Gaussian Splat";
    splat.userData.heraAssetKind = "splat";
    splat.userData.heraSplatSourceMode = mode;
    splat.userData.heraSplatPaged = !!options.paged;
    splat.userData.heraSplatSource = {
        mode,
        url: options.url ?? null,
        fileName: options.fileName ?? null,
        fileType: options.fileType ?? null,
        paged: !!options.paged,
        lod: !!options.lod,
    };
    await splat.initialized;
    return splat;
}

async function loadWithPlan({
    SplatMesh,
    asset,
    manifest,
    sparkModule,
    url,
    name,
    variant,
    variantMeta,
    fallback = false,
}) {
    const startedAt = performance.now();
    const resolvedUrl = getResource(url);
    if (!resolvedUrl) {
        throw new Error("[loadSparkSplatAsset] Missing splat URL.");
    }

    const plan = buildSparkSplatOptions({
        url: resolvedUrl,
        fileName: name,
        manifest,
        variant,
        variantMeta,
    });

    logSplatSourceDebug(fallback ? "falling back to original splat" : sourceMessage(plan.mode), {
        assetId: asset?.id ?? null,
        name,
        url: resolvedUrl,
        variant,
        mode: plan.mode,
        paged: plan.paged,
    });
    logSplatDebug("viewer-load-start", buildSplatDebugPayload({
        asset,
        url: resolvedUrl,
        options: plan.options,
        sparkModule,
        manifest,
        source: {
            variant,
            mode: plan.mode,
            paged: plan.paged,
            fallback,
            originalPath: getOriginalSplatPath(manifest),
            radPath: getSparkRadSplatPath(manifest),
        },
    }));

    let splat;
    try {
        splat = await createSparkSplat({
            SplatMesh,
            options: plan.options,
            name,
            mode: plan.mode,
        });
    } catch (error) {
        if (!shouldUseModernSpzFallback({error, fileName: name, url: resolvedUrl})) {
            throw error;
        }

        console.warn("[HERA][SplatSource] using modern SPZ fallback", {
            assetId: asset?.id ?? null,
            name,
            url: resolvedUrl,
            error: error?.message ?? String(error),
        });
        const { default: createSpzModule } = await import("@adobe/spz");
        splat = await createModernSpzSparkSplat({
            SplatMesh,
            createSpzModule,
            url: resolvedUrl,
            name: name || "Gaussian Splat",
            mode: `${plan.mode}-spz-modern`,
            baseOptions: plan.options,
        });
    }

    logSplatDebug("viewer-load-end", buildSplatDebugPayload({
        asset,
        object: splat,
        url: resolvedUrl,
        options: plan.options,
        sparkModule,
        manifest,
        loadMs: performance.now() - startedAt,
        source: {
            variant,
            mode: plan.mode,
            paged: plan.paged,
            fallback,
            originalPath: getOriginalSplatPath(manifest),
            radPath: getSparkRadSplatPath(manifest),
        },
    }));

    return {
        splat,
        plan,
    };
}

export async function loadSparkSplatAsset({ url, name, asset = null, manifest = null, variant = null, variantMeta = null }) {
    const sparkModule = await import("@sparkjsdev/spark");
    const { SplatMesh } = sparkModule;

    try {
        const { splat } = await loadWithPlan({
            SplatMesh,
            asset,
            manifest,
            sparkModule,
            url,
            name,
            variant,
            variantMeta,
        });
        return splat;
    } catch (error) {
        const originalPath = getOriginalSplatPath(manifest);
        const canFallback = originalPath && originalPath !== url;
        if (!canFallback) throw error;

        console.warn("[HERA][SplatSource] falling back to original splat", {
            assetId: asset?.id ?? null,
            name,
            failedUrl: url,
            originalPath,
            error: error?.message ?? String(error),
        });

        const { splat } = await loadWithPlan({
            SplatMesh,
            asset,
            manifest,
            sparkModule,
            url: originalPath,
            name,
            variant: "original",
            variantMeta: manifest?.variants?.original ?? null,
            fallback: true,
        });
        return splat;
    }
}
