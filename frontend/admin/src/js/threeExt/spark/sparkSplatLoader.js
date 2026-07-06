import { getResource } from "@/js/endpoints.js";
import { ensureSparkRenderer } from "@/js/threeExt/spark/sparkRuntime.js";
import {buildSplatDebugPayload, logSplatDebug, logSplatSourceDebug} from "@shared/splat/splatDiagnostics.js";
import {buildSparkSplatOptions, getOriginalSplatPath, getSparkRadSplatPath, SPLAT_SOURCE_MODES} from "@shared/splat/splatSource.js";

function sourceMessage(mode) {
    if (mode === SPLAT_SOURCE_MODES.RAD_PAGED) return "using paged .rad";
    if (mode === SPLAT_SOURCE_MODES.RAD) return "using .rad";
    return "using original splat quick LoD";
}

async function createSplat({ SplatMesh, options, asset, mode }) {
    const splat = new SplatMesh(options);
    splat.name = asset?.name || "Gaussian Splat";
    splat.userData.heraAssetKind = "splat";
    splat.userData.heraSplatSourceMode = mode;
    splat.userData.heraSplatPaged = !!options.paged;
    splat.userData.heraSplatSource = {
        mode,
        url: options.url ?? null,
        fileName: options.fileName ?? null,
        paged: !!options.paged,
        lod: !!options.lod,
    };
    await splat.initialized;
    return splat;
}

export async function loadSparkSplatResource({ asset, url, fromUpload, state, ctx }) {
    const startedAt = performance.now(); //calcul de temps de chargement pris

    await ensureSparkRenderer({
        renderer: ctx?.options?.renderer,
        scene: ctx?.scene,
        force: true,
    });
    //charger package sparkjs si on en a besoin / si scène contient un splat
    const sparkModule = await import("@sparkjsdev/spark");
    const { SplatMesh } = sparkModule;

    async function loadPlanned({ sourceUrl, variant, variantMeta, fallback = false }) {
        let fileBytes = null;
        let finalUrl = null;
        const fileName = asset?.uploadData?.name ?? asset?.name;

        if (fromUpload && asset?.uploadData && !fallback) {
            fileBytes = await asset.uploadData.arrayBuffer();
        } else {
            finalUrl = getResource(sourceUrl ?? asset?.sourceUrl);
            if (!finalUrl) {
                throw new Error("[loadSparkSplatResource] No URL to load.");
            }
        }

        const plan = buildSparkSplatOptions({url: finalUrl, fileBytes, fileName, manifest: state?.source?.manifest ?? null, variant, variantMeta, fromUpload: !!fileBytes,});

        logSplatSourceDebug(fallback ? "falling back to original splat" : sourceMessage(plan.mode), {assetId: asset?.id ?? null, name: asset?.name ?? null, url: finalUrl ?? fileName, variant, mode: plan.mode, paged: plan.paged,});

        logSplatDebug("admin-load-start", buildSplatDebugPayload({asset, renderer: ctx?.options?.renderer, url: finalUrl ?? fileName, options: plan.options, sparkModule, manifest: state?.source?.manifest ?? null,
            source: {
                fromUpload: !!fromUpload,
                graphKind: state?.source?.kind ?? null,
                variant,
                mode: plan.mode,
                paged: plan.paged,
                fallback,
                originalPath: getOriginalSplatPath(state?.source?.manifest ?? null),
                radPath: getSparkRadSplatPath(state?.source?.manifest ?? null),
            },
        }));
        //création de splat
        const splat = await createSplat({SplatMesh, options: plan.options, asset, mode: plan.mode,});

        logSplatDebug("admin-load-end", buildSplatDebugPayload({
            asset,
            object: splat,
            renderer: ctx?.options?.renderer,
            url: finalUrl ?? fileName,
            options: plan.options,
            sparkModule,
            manifest: state?.source?.manifest ?? null,
            loadMs: performance.now() - startedAt,
            source: {
                fromUpload: !!fromUpload,
                graphKind: state?.source?.kind ?? null,
                variant,
                mode: plan.mode,
                paged: plan.paged,
                fallback,
                originalPath: getOriginalSplatPath(state?.source?.manifest ?? null),
                radPath: getSparkRadSplatPath(state?.source?.manifest ?? null),
            },
        }));

        return splat;
    }
    //essayer de charge source prévue selon manifest (rad) sinon il charge l'original
    try {
        return await loadPlanned({sourceUrl: url ?? asset?.sourceUrl, variant: state?.source?.variant ?? null, variantMeta: state?.source?.variantMeta ?? null,});
    } catch (error) {
        const originalPath = getOriginalSplatPath(state?.source?.manifest ?? null);
        const canFallback = !fromUpload && originalPath && originalPath !== (url ?? asset?.sourceUrl);
        if (!canFallback) throw error;

        console.warn("[HERA][SplatSource] falling back to original splat", {
            assetId: asset?.id ?? null,
            name: asset?.name ?? null,
            failedUrl: url,
            originalPath,
            error: error?.message ?? String(error),
        });

        return await loadPlanned({
            sourceUrl: originalPath,
            variant: "original",
            variantMeta: state?.source?.manifest?.variants?.original ?? null,
            fallback: true,
        });
    }
}
