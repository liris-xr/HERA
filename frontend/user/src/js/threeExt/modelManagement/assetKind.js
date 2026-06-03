import {
    detectAssetKindFromPath,
    getAssetExtension as getSharedAssetExtension,
} from "@shared/assetKinds.js";

export function getAssetExtension(value = "") {
    return getSharedAssetExtension(value);
}

export function detectAssetKind(asset = {}, source = null) {
    const explicitKind = asset?.kind ?? asset?.type ?? null;
    const path = source?.url ?? asset?.sourceUrl ?? asset?.url ?? asset?.copiedUrl ?? asset?.name ?? "";

    return detectAssetKindFromPath(path, { explicitKind });
}
