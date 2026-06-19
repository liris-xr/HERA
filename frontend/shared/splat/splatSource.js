import { getAssetExtension } from "../assetKinds.js";

export const SPLAT_SOURCE_MODES = Object.freeze({
    QUICK_LOD: "quick-lod",
    RAD: "rad",
    RAD_PAGED: "rad-paged",
});

function firstBoolean(...values) {
    for (const value of values) {
        if (typeof value === "boolean") return value;
    }
    return null;
}

export function isRadSplatUrl(url = "") {
    return getAssetExtension(url) === "rad";
}

export function getSplatVariantMeta(manifest = null, variant = null) {
    if (!manifest || !variant) return null;
    return manifest?.variants?.[variant] ?? null;
}

export function getOriginalSplatPath(manifest = null) {
    const original = manifest?.variants?.original;
    return original?.status === "ready" && original?.path ? original.path : null;
}

export function getSparkRadSplatPath(manifest = null) {
    const rad = manifest?.variants?.sparkRad;
    return rad?.status === "ready" && rad?.path ? rad.path : null;
}

export function getSplatSourcePlan({
    url = "",
    manifest = null,
    variant = null,
    variantMeta = null,
    fromUpload = false,
} = {}) {
    const meta = variantMeta ?? getSplatVariantMeta(manifest, variant);
    const splatMeta = manifest?.lodMeta?.splat ?? manifest?.splat ?? {};
    const isRad = isRadSplatUrl(url) || meta?.format === "spark-rad";

    if (!isRad) {
        return {
            mode: SPLAT_SOURCE_MODES.QUICK_LOD,
            isRad: false,
            paged: false,
        };
    }

    const pagedHint = firstBoolean(
        meta?.paged,
        meta?.streaming,
        splatMeta?.paged,
        splatMeta?.streaming,
    );
    const paged = !fromUpload && pagedHint === true;

    return {
        mode: paged ? SPLAT_SOURCE_MODES.RAD_PAGED : SPLAT_SOURCE_MODES.RAD,
        isRad: true,
        paged,
    };
}

export function buildSparkSplatOptions({
    url = null,
    fileBytes = null,
    fileName = null,
    manifest = null,
    variant = null,
    variantMeta = null,
    fromUpload = false,
} = {}) {
    const plan = getSplatSourcePlan({
        url: url ?? fileName ?? "",
        manifest,
        variant,
        variantMeta,
        fromUpload,
    });

    const options = {
        fileName,
        raycastable: false,
    };

    if (fileBytes) {
        options.fileBytes = fileBytes;
    } else if (url) {
        options.url = url;
    }

    if (plan.mode === SPLAT_SOURCE_MODES.QUICK_LOD) {
        options.lod = true;
    } else if (plan.paged) {
        options.paged = true;
    }

    return {
        ...plan,
        options,
    };
}
