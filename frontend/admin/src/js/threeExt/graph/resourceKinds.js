import { detectAssetKindFromPath } from "../../../../../shared/assetKinds.js";

export function detectAssetKind(asset, source = null) {
    const explicitKind = asset?.kind ?? asset?.type ?? null;
    const path = source?.url ?? asset?.sourceUrl ?? asset?.copiedUrl ?? asset?.name ?? "";

    return detectAssetKindFromPath(path, {
        explicitKind,
        includeStaticPointCloud: true,
        includePotreeArchive: true,
    });
}
