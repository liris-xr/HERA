import decompress from "decompress";
import fs from "node:fs";
import path from "node:path";

const POTREE_ARCHIVE_EXTENSIONS = new Set([".zip"]);

function normalizeRelPath(value = "") {
    return String(value ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function toPosixRel(from, to) {
    return normalizeRelPath(path.relative(from, to));
}

function isSafeArchivePath(value = "") {
    const normalized = path.posix.normalize(String(value).replaceAll("\\", "/"));
    if (!normalized || normalized === ".") return false;
    if (normalized.startsWith("../")) return false;
    if (path.posix.isAbsolute(normalized)) return false;
    return !normalized.split("/").includes("..");
}

function sortByPathDepthThenName(a, b) {
    const depthA = normalizeRelPath(a).split("/").length;
    const depthB = normalizeRelPath(b).split("/").length;
    return depthA - depthB || a.localeCompare(b);
}

async function listFilesRecursive(rootDir) {
    const files = [];

    async function walk(currentDir) {
        const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (entry.isFile()) {
                files.push(fullPath);
            }
        }
    }

    await walk(rootDir);
    return files;
}

function readJsonFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
        return null;
    }
}

function findEntryFile(files, fileName) {
    return files
        .filter((file) => path.basename(file).toLowerCase() === fileName)
        .sort(sortByPathDepthThenName)[0] ?? null;
}

function buildPointCloudMeta({ format, entryRel, assetName, metadata = null }) {
    return {
        assetKind: "pointcloud-streaming",
        original: {
            status: "ready",
            path: entryRel,
        },
        pointCloud: {
            format,
            entry: path.posix.basename(entryRel),
            assetName: assetName ?? null,
            pointCount: metadata?.points ?? metadata?.numPoints ?? null,
            boundingBox: metadata?.boundingBox ?? null,
            spacing: metadata?.spacing ?? null,
            importedAt: new Date().toISOString(),
        },
    };
}

export function isPotreeArchivePath(value = "") {
    return POTREE_ARCHIVE_EXTENSIONS.has(path.extname(normalizeRelPath(value)).toLowerCase());
}

export async function inspectPotreeDatasetDirectory(directory, apiRoot, assetName = null) {
    const files = await listFilesRecursive(directory);
    const metadataPath = findEntryFile(files, "metadata.json");

    if (metadataPath) {
        const entryDir = path.dirname(metadataPath);
        const octreePath = path.join(entryDir, "octree.bin");
        const hierarchyPath = path.join(entryDir, "hierarchy.bin");

        if (!fs.existsSync(octreePath) || !fs.existsSync(hierarchyPath)) {
            throw new Error("Potree v2 dataset must include metadata.json, octree.bin, and hierarchy.bin in the same folder.");
        }

        const metadata = readJsonFile(metadataPath);
        if (!metadata || typeof metadata !== "object") {
            throw new Error("Potree metadata.json is not valid JSON.");
        }

        const entryRel = toPosixRel(apiRoot, metadataPath);
        return {
            url: entryRel,
            lodMeta: buildPointCloudMeta({
                format: "potree-v2",
                entryRel,
                assetName,
                metadata,
            }),
        };
    }

    const cloudPath = findEntryFile(files, "cloud.js");
    if (cloudPath) {
        const entryRel = toPosixRel(apiRoot, cloudPath);
        return {
            url: entryRel,
            lodMeta: buildPointCloudMeta({
                format: "potree-v1",
                entryRel,
                assetName,
            }),
        };
    }

    throw new Error("Archive does not contain a Potree metadata.json or cloud.js entry file.");
}

export async function importPotreeArchive({ archiveRelPath, assetName = null, apiRoot = process.cwd() }) {
    const normalizedArchiveRel = normalizeRelPath(archiveRelPath);
    const archiveDiskPath = path.resolve(apiRoot, normalizedArchiveRel);

    if (!isPotreeArchivePath(normalizedArchiveRel)) {
        return null;
    }

    if (!fs.existsSync(archiveDiskPath)) {
        throw new Error(`Uploaded archive not found: ${normalizedArchiveRel}`);
    }

    const targetDir = path.join(
        path.dirname(archiveDiskPath),
        `${path.basename(archiveDiskPath, path.extname(archiveDiskPath))}_potree`
    );

    await fs.promises.rm(targetDir, { recursive: true, force: true });
    await fs.promises.mkdir(targetDir, { recursive: true });

    await decompress(archiveDiskPath, targetDir, {
        filter: (file) => isSafeArchivePath(file.path) && !normalizeRelPath(file.path).startsWith("__MACOSX/"),
    });

    const result = await inspectPotreeDatasetDirectory(targetDir, apiRoot, assetName);

    await fs.promises.rm(archiveDiskPath, { force: true });

    return {
        ...result,
        importedArchive: normalizedArchiveRel,
    };
}
