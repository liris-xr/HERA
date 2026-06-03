import fs from "node:fs";
import path from "node:path";

//détermine type d'asset .ply

const STATIC_POINT_CLOUD_EXTENSIONS = new Set([".ply"]);
const MAX_PLY_HEADER_BYTES = 1024 * 1024;

function normalizeRelPath(value = "") {
    return String(value ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function toPosixRel(from, to) {
    return normalizeRelPath(path.relative(from, to));
}
//reading header of ply file
function parsePlyHeader(headerText) {
    const lines = headerText.split(/\r?\n/);
 
    if (lines[0]?.trim() !== "ply") {
        throw new Error("Classic point cloud upload must be a valid PLY file.");
    }

    let format = null;
    let vertexCount = null;
    let currentElement = null;
    const vertexProperties = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("comment ") || line.startsWith("obj_info ")) continue;

        const parts = line.split(/\s+/);
        if (parts[0] === "format") {
            format = parts[1] ?? null;
            continue;
        }

        if (parts[0] === "element") {
            currentElement = parts[1] ?? null;
            if (currentElement === "vertex") {
                const count = Number(parts[2]);
                vertexCount = Number.isFinite(count) ? count : null;
            }
            continue;
        }

        if (parts[0] === "property" && currentElement === "vertex") {
            vertexProperties.push(parts[parts.length - 1]?.toLowerCase() ?? "");
        }
    }
    //résultat de parsePlyHeader :
    return {format, pointCount: vertexCount, vertexProperties,};
}
//utile pour GS car ils toujours propriétés comme f_dc_0 ou scale_0 ..
function hasAnyPrefix(properties, prefixes) {
    for (const property of properties) {
        for (const prefix of prefixes) {
            if (property.startsWith(prefix)) return true;
        }
    }
    return false;
}
//fonction qui classfie le PLY
function classifyPlyHeader(header) {
    const properties = new Set((header.vertexProperties ?? []).map((p) => String(p).toLowerCase()));
    //si pas de positions x,y et z alors c pas point cloud
    if (!properties.has("x") || !properties.has("y") || !properties.has("z")) {
        return null;
    }
    //score pour GS
    let gaussianScore = 0;
    if (hasAnyPrefix(properties, ["f_dc_", "f_rest_"])) gaussianScore++;
    if (properties.has("opacity")) gaussianScore++;
    if (hasAnyPrefix(properties, ["scale_"])) gaussianScore++;
    if (hasAnyPrefix(properties, ["rot_"])) gaussianScore++;

    return gaussianScore >= 2 ? "splat" : "pointcloud";
}
//lis header depuis fichier
async function readPlyHeaderInfo(diskPath) {
    const handle = await fs.promises.open(diskPath, "r");

    try {
        const buffer = Buffer.alloc(MAX_PLY_HEADER_BYTES);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        const text = buffer.subarray(0, bytesRead).toString("utf8");
        const endIndex = text.indexOf("end_header");

        if (endIndex === -1) {
            throw new Error("PLY header is missing end_header.");
        }

        return parsePlyHeader(text.slice(0, endIndex + "end_header".length));
    } finally {
        await handle.close();
    }
}

export function isStaticPointCloudPath(value = "") {
    return STATIC_POINT_CLOUD_EXTENSIONS.has(path.extname(normalizeRelPath(value)).toLowerCase());
}

export async function inspectPlyPointCloudFile({fileRelPath, apiRoot = process.cwd(),}) {
    const normalizedRel = normalizeRelPath(fileRelPath);

    if (!isStaticPointCloudPath(normalizedRel)) {
        return null;
    }

    const diskPath = path.resolve(apiRoot, normalizedRel);
    if (!fs.existsSync(diskPath)) {
        throw new Error(`Uploaded point cloud not found: ${normalizedRel}`);
    }

    const header = await readPlyHeaderInfo(diskPath);
    const assetKind = classifyPlyHeader(header);
    const stat = await fs.promises.stat(diskPath);

    return {normalizedRel, diskPath, header, assetKind, stat,};
}

export async function prepareStaticPointCloudAsset({fileRelPath, assetName = null, apiRoot = process.cwd(), strict = true,}) {
    const inspected = await inspectPlyPointCloudFile({ fileRelPath, apiRoot });
    if (!inspected) return null;

    const { diskPath, header, assetKind, stat } = inspected;

    if (assetKind !== "pointcloud") {
        if (!strict) return null;

        if (assetKind === "splat") {
            throw new Error("This .ply looks like a Gaussian splat. Upload it as a splat, not as a classic point cloud.");
        }

        throw new Error("Classic point cloud .ply must contain vertex x, y, and z properties.");
    }

    const entryRel = toPosixRel(apiRoot, diskPath);

    return {
        url: entryRel,
        lodMeta: {
            assetKind: "pointcloud",
            original: {
                status: "ready",
                path: entryRel,
            },
            pointCloud: {
                format: "ply",
                encoding: header.format,
                assetName,
                pointCount: header.pointCount,
                fileSizeBytes: stat.size,
                properties: header.vertexProperties,
                importedAt: new Date().toISOString(),
            },
        },
    };
}
