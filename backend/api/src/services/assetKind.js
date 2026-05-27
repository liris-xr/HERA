const GLTF_EXTENSIONS = new Set([".glb", ".gltf"]);
const SPLAT_EXTENSIONS = new Set([".splat", ".spz", ".ksplat", ".ply", ".sog"]);

export function getAssetExtension(urlOrName = "") {
    const path = String(urlOrName ?? "").split(/[?#]/)[0].toLowerCase();
    const dot = path.lastIndexOf(".");
    return dot === -1 ? "" : path.slice(dot);
}

export function detectAssetKind(assetOrPath = "") {
    const path = typeof assetOrPath === "string"
        ? assetOrPath
        : assetOrPath?.kind ?? assetOrPath?.type ?? assetOrPath?.url ?? assetOrPath?.name ?? "";

    const explicit = typeof assetOrPath === "object" ? assetOrPath?.kind ?? assetOrPath?.type : null;
    if (explicit) return String(explicit).toLowerCase();

    const ext = getAssetExtension(path);
    if (SPLAT_EXTENSIONS.has(ext)) return "splat";
    if (GLTF_EXTENSIONS.has(ext)) return "gltf";

    return "gltf";
}

export function isGltfAsset(assetOrPath) {
    return detectAssetKind(assetOrPath) === "gltf";
}
