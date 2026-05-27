const GLTF_EXTENSIONS = new Set(["glb", "gltf"]);
const SPLAT_EXTENSIONS = new Set(["splat", "spz", "ksplat", "ply", "sog"]);

export function getAssetExtension(value = "") {
    return String(value ?? "")
        .split(/[?#]/)[0]
        .split(".")
        .pop()
        ?.toLowerCase() ?? "";
}

export function detectAssetKind(asset = {}, source = null) {
    const explicitKind = asset?.kind ?? asset?.type ?? null;
    if (explicitKind) return String(explicitKind).toLowerCase();

    const path = source?.url ?? asset?.sourceUrl ?? asset?.url ?? asset?.copiedUrl ?? asset?.name ?? "";
    const ext = getAssetExtension(path);

    if (SPLAT_EXTENSIONS.has(ext)) return "splat";
    if (GLTF_EXTENSIONS.has(ext)) return "gltf";

    return "gltf"; //par sécurité on retourne à glb; fallback

}
