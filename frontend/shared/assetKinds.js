export const ASSET_KINDS = Object.freeze({
    GLTF: "gltf",
    SPLAT: "splat",
    POINTCLOUD: "pointcloud",
    POINTCLOUD_STREAMING: "pointcloud-streaming",
});

const GLTF_EXTENSIONS = new Set(["glb", "gltf"]);
const SPLAT_EXTENSIONS = new Set(["splat", "spz", "ksplat", "ply", "sog"]);
const POTREE_ENTRY_FILES = new Set(["metadata.json", "cloud.js"]);
const POTREE_ARCHIVE_EXTENSIONS = new Set(["zip"]);

export function getAssetExtension(value = "") {
    return String(value ?? "")
        .split(/[?#]/)[0]
        .split(".")
        .pop()
        ?.toLowerCase() ?? "";
}

export function getCleanFileName(value = "") {
    return String(value ?? "")
        .split(/[?#]/)[0]
        .replaceAll("\\", "/")
        .split("/")
        .pop()
        ?.toLowerCase() ?? "";
}

export function isPotreeStreamingEntry(value = "") {
    return POTREE_ENTRY_FILES.has(getCleanFileName(value));
}

export function detectAssetKindFromPath(path = "", options = {}) {
    const explicitKind = options.explicitKind ?? null;
    if (explicitKind) return String(explicitKind).toLowerCase();

    if (isPotreeStreamingEntry(path)) return ASSET_KINDS.POINTCLOUD_STREAMING;

    const ext = getAssetExtension(path);
    if (options.includePotreeArchive && POTREE_ARCHIVE_EXTENSIONS.has(ext)) {
        return ASSET_KINDS.POINTCLOUD_STREAMING;
    }

    if (SPLAT_EXTENSIONS.has(ext)) return ASSET_KINDS.SPLAT;
    if (GLTF_EXTENSIONS.has(ext)) return ASSET_KINDS.GLTF;
    if (options.includeStaticPointCloud && ext === "pcd") return ASSET_KINDS.POINTCLOUD;

    return options.fallback ?? ASSET_KINDS.GLTF;
}
