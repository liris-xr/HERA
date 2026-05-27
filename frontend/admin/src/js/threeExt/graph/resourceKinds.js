export function detectAssetKind(asset, source = null) {
    const explicitKind = asset?.kind ?? asset?.type ?? null;
    if (explicitKind) return String(explicitKind).toLowerCase();

    const path = source?.url ?? asset?.sourceUrl ?? asset?.copiedUrl ?? asset?.name ?? "";
    const lower = String(path).toLowerCase();

    if (lower.endsWith(".glb") || lower.endsWith(".gltf")) return "gltf";
    if (
        lower.endsWith(".splat") ||
        lower.endsWith(".spz") ||
        lower.endsWith(".ksplat") ||
        lower.endsWith(".ply") ||
        lower.endsWith(".sog")
    ) return "splat";
    if (lower.endsWith(".pcd")) return "pointcloud";

    return "gltf";
}
