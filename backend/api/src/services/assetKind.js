const GLTF_EXTENSIONS = new Set([".glb", ".gltf"]);
const SPLAT_EXTENSIONS = new Set([".splat", ".spz", ".ksplat", ".ply", ".sog"]);
const POTREE_ENTRY_FILES = new Set(["metadata.json", "cloud.js"]);

export const ASSET_KINDS = Object.freeze({
    GLTF: "gltf",
    SPLAT: "splat",
    POINTCLOUD: "pointcloud", // .ply normal
    POINTCLOUD_STREAMING: "pointcloud-streaming", //format potree prêt à streamer
});

function parseLodMeta(raw) {
    if (!raw) return null;
    if (typeof raw === "object") return raw;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function getExplicitAssetKind(assetOrPath) {
    if (!assetOrPath || typeof assetOrPath !== "object") return null;

    const explicit = assetOrPath.kind ?? assetOrPath.type;
    if (explicit) return String(explicit).toLowerCase();

    const lodMeta = parseLodMeta(assetOrPath.lodMeta);
    const lodKind = lodMeta?.assetKind ?? lodMeta?.pointCloud?.assetKind;
    return lodKind ? String(lodKind).toLowerCase() : null;
}

export function getAssetExtension(urlOrName = "") {
    const path = String(urlOrName ?? "").split(/[?#]/)[0].toLowerCase();
    const dot = path.lastIndexOf(".");
    return dot === -1 ? "" : path.slice(dot);
}

export function detectAssetKind(assetOrPath = "") {
    const explicit = getExplicitAssetKind(assetOrPath);
    if (explicit) return explicit;

    const path = typeof assetOrPath === "string"
        ? assetOrPath
        : assetOrPath?.url ?? assetOrPath?.sourceUrl ?? assetOrPath?.copiedUrl ?? assetOrPath?.name ?? "";

    const ext = getAssetExtension(path);
    const fileName = String(path ?? "")
        .split(/[?#]/)[0]
        .replaceAll("\\", "/")
        .split("/")
        .pop()
        ?.toLowerCase() ?? "";

    if (POTREE_ENTRY_FILES.has(fileName)) return ASSET_KINDS.POINTCLOUD_STREAMING;
    if (SPLAT_EXTENSIONS.has(ext)) return ASSET_KINDS.SPLAT;
    if (GLTF_EXTENSIONS.has(ext)) return ASSET_KINDS.GLTF;

    return ASSET_KINDS.GLTF;
}

export function isGltfAsset(assetOrPath) {
    return detectAssetKind(assetOrPath) === ASSET_KINDS.GLTF;
}

export function isPointCloudAsset(assetOrPath) {
    return detectAssetKind(assetOrPath) === ASSET_KINDS.POINTCLOUD;
}

export function isPointCloudStreamingAsset(assetOrPath) {
    return detectAssetKind(assetOrPath) === ASSET_KINDS.POINTCLOUD_STREAMING;
}
