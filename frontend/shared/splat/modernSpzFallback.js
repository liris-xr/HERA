import { getAssetExtension } from "../assetKinds.js";

const NGSP_MAGIC = [0x4e, 0x47, 0x53, 0x50];
const GZIP_MAGIC = [0x1f, 0x8b];

function toUint8Array(value) {
    if (!value) return null;
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    return null;
}

export function isModernSpzBytes(value) {
    const bytes = toUint8Array(value);
    return !!bytes
        && bytes.length >= NGSP_MAGIC.length
        && NGSP_MAGIC.every((byte, index) => bytes[index] === byte);
}

function isLegacyGzipBytes(value) {
    const bytes = toUint8Array(value);
    return !!bytes
        && bytes.length >= GZIP_MAGIC.length
        && GZIP_MAGIC.every((byte, index) => bytes[index] === byte);
}

function isSpzSource({ fileName = "", url = "" } = {}) {
    return getAssetExtension(fileName || url) === "spz";
}

export function shouldUseModernSpzFallback({ error = null, fileName = "", url = "", fileBytes = null } = {}) {
    if (!isSpzSource({ fileName, url })) return false;
    if (isModernSpzBytes(fileBytes)) return true;
    if (isLegacyGzipBytes(fileBytes)) return false;

    const message = String(error?.message ?? error ?? "").toLowerCase();
    return message.includes("gzip")
        || message.includes("header")
        || message.includes("spz");
}

async function readSpzBytes({ fileBytes = null, url = null } = {}) {
    const bytes = toUint8Array(fileBytes);
    if (bytes) return bytes;
    if (!url) throw new Error("Modern SPZ fallback needs file bytes or a URL.");

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Unable to fetch SPZ fallback bytes (${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
}

function safeFinite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function shDimForDegree(degree) {
    switch (degree) {
        case 1:
            return 3;
        case 2:
            return 8;
        case 3:
        case 4:
            return 15;
        default:
            return 0;
    }
}

function serializeCloudToPlyBytes(cloud) {
    const pointCount = cloud.numPoints;
    const availableShDim = Math.floor((cloud.sh?.length ?? 0) / Math.max(1, pointCount) / 3);
    const shDim = Math.min(availableShDim, shDimForDegree(cloud.shDegree));
    const floatsPerPoint = 17 + shDim * 3;
    const header = [
        "ply",
        "format binary_little_endian 1.0",
        `element vertex ${pointCount}`,
        "property float x",
        "property float y",
        "property float z",
        "property float nx",
        "property float ny",
        "property float nz",
        "property float f_dc_0",
        "property float f_dc_1",
        "property float f_dc_2",
        ...Array.from({ length: shDim * 3 }, (_, i) => `property float f_rest_${i}`),
        "property float opacity",
        "property float scale_0",
        "property float scale_1",
        "property float scale_2",
        "property float rot_0",
        "property float rot_1",
        "property float rot_2",
        "property float rot_3",
        "end_header\n",
    ].join("\n");
    const values = new Float32Array(pointCount * floatsPerPoint);
    let out = 0;
    for (let i = 0; i < cloud.numPoints; i++) {
        const i3 = i * 3;
        const i4 = i * 4;

        values[out++] = safeFinite(cloud.positions[i3]);
        values[out++] = safeFinite(cloud.positions[i3 + 1]);
        values[out++] = safeFinite(cloud.positions[i3 + 2]);
        values[out++] = 0;
        values[out++] = 0;
        values[out++] = 0;
        values[out++] = safeFinite(cloud.colors[i3]);
        values[out++] = safeFinite(cloud.colors[i3 + 1]);
        values[out++] = safeFinite(cloud.colors[i3 + 2]);

        for (let j = 0; j < shDim; j++) {
            values[out++] = safeFinite(cloud.sh[(i * availableShDim + j) * 3]);
        }
        for (let j = 0; j < shDim; j++) {
            values[out++] = safeFinite(cloud.sh[(i * availableShDim + j) * 3 + 1]);
        }
        for (let j = 0; j < shDim; j++) {
            values[out++] = safeFinite(cloud.sh[(i * availableShDim + j) * 3 + 2]);
        }

        values[out++] = safeFinite(cloud.alphas[i]);
        values[out++] = safeFinite(cloud.scales[i3]);
        values[out++] = safeFinite(cloud.scales[i3 + 1]);
        values[out++] = safeFinite(cloud.scales[i3 + 2]);
        values[out++] = safeFinite(cloud.rotations[i4 + 3], 1);
        values[out++] = safeFinite(cloud.rotations[i4]);
        values[out++] = safeFinite(cloud.rotations[i4 + 1]);
        values[out++] = safeFinite(cloud.rotations[i4 + 2]);
    }

    const headerBytes = new TextEncoder().encode(header);
    const result = new Uint8Array(headerBytes.length + values.byteLength);
    result.set(headerBytes, 0);
    result.set(new Uint8Array(values.buffer), headerBytes.length);
    return result;
}

export async function createModernSpzSparkSplat({
    SplatMesh,
    createSpzModule,
    fileBytes = null,
    url = null,
    name = "Gaussian Splat",
    mode = "modern-spz-fallback",
    baseOptions = {},
} = {}) {
    if (typeof createSpzModule !== "function") {
        throw new Error("Modern SPZ fallback needs a createSpzModule function.");
    }

    const bytes = await readSpzBytes({ fileBytes, url });
    const spz = await createSpzModule();
    const cloud = spz.loadSpzFromBuffer(bytes, {
        to: spz.CoordinateSystem.RUB,
    });

    if (!cloud?.numPoints) {
        throw new Error("Modern SPZ fallback decoded zero splats.");
    }

    const plyBytes = serializeCloudToPlyBytes(cloud);
    const splat = new SplatMesh({
        raycastable: baseOptions.raycastable ?? false,
        fileBytes: plyBytes,
        fileName: `${name}.ply`,
        fileType: "ply",
    });
    splat.name = name;
    splat.userData.heraAssetKind = "splat";
    splat.userData.heraSplatSourceMode = mode;
    splat.userData.heraSplatModernFallback = true;
    splat.userData.heraSplatSource = {
        mode,
        url,
        fileName: name,
        fileType: "spz-modern",
        pointCount: cloud.numPoints,
    };
    await splat.initialized;
    return splat;
}
