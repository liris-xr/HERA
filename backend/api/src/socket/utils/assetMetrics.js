import path from "node:path";
import fs from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import sharp from "sharp";

function normalizeUrlPath(u) {
    return String(u ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function computeFileSizeBytes(diskPath) {
    try {
        const stat = fs.statSync(diskPath);
        return stat.isFile() ? stat.size : null;
    } catch {
        return null;
    }
}

function makeEmptyMetrics(fileSizeBytes = null) {
    return {
        assetSizeBytes: fileSizeBytes,
        triangleCount: null,
        vertexCount: null,
        meshCount: null,
        textureCount: null,
        textureBytes: null,
        maxTextureWidth: null,
        maxTextureHeight: null,
        maxTexturePixels: null,
        cacheWeight: null,
    };
}

function computeCacheWeight(metrics) {
    const fileMb = Number(metrics.assetSizeBytes ?? 0) / (1024 * 1024);
    const textureMb = Number(metrics.textureBytes ?? 0) / (1024 * 1024);
    const triangles = Number(metrics.triangleCount ?? 0);

    const score =
        1 +
        fileMb * 0.25 +
        textureMb * 0.5 +
        triangles / 50000;

    return Number(Math.max(1, score).toFixed(2));
}

function getTextureBuffer(texture, diskPath) {
    const embedded = texture.getImage?.();
    if (embedded?.byteLength) {
        return Buffer.from(embedded);
    }

    const uri = texture.getURI?.();
    if (!uri || !diskPath) return null;

    if (uri.startsWith("data:")) {
        const commaIndex = uri.indexOf(",");
        if (commaIndex === -1) return null;
        return Buffer.from(uri.slice(commaIndex + 1), "base64");
    }

    const textureDisk = path.resolve(path.dirname(diskPath), uri);
    try {
        return fs.readFileSync(textureDisk);
    } catch {
        return null;
    }
}

async function getTextureDimensions(buffer) {
    if (!buffer?.byteLength) return { width: null, height: null };

    try {
        const metadata = await sharp(buffer).metadata();
        return {
            width: metadata.width ?? null,
            height: metadata.height ?? null,
        };
    } catch {
        return { width: null, height: null };
    }
}

export async function computeGeometryMetricsFromFile(diskPath) {
    const result = makeEmptyMetrics(computeFileSizeBytes(diskPath));

    try {
        const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
        const document = await io.read(diskPath);
        const root = document.getRoot();

        let triangleCount = 0;
        let vertexCount = 0;
        let meshCount = 0;
        let textureBytes = 0;
        let maxTextureWidth = 0;
        let maxTextureHeight = 0;
        let maxTexturePixels = 0;

        for (const mesh of root.listMeshes()) {
            meshCount++;

            for (const prim of mesh.listPrimitives()) {
                const indices = prim.getIndices();
                const position = prim.getAttribute("POSITION");

                if (indices) {
                    triangleCount += Math.floor(indices.getCount() / 3);
                } else if (position) {
                    triangleCount += Math.floor(position.getCount() / 3);
                }

                if (position) {
                    vertexCount += position.getCount();
                }
            }
        }

        result.triangleCount = triangleCount;
        result.vertexCount = vertexCount;
        result.meshCount = meshCount;
        result.textureCount = root.listTextures().length;

        for (const texture of root.listTextures()) {
            const buffer = getTextureBuffer(texture, diskPath);
            if (buffer?.byteLength) {
                textureBytes += buffer.byteLength;
            }

            const { width, height } = await getTextureDimensions(buffer);
            const pixels = width && height ? width * height : 0;

            maxTextureWidth = Math.max(maxTextureWidth, width ?? 0);
            maxTextureHeight = Math.max(maxTextureHeight, height ?? 0);
            maxTexturePixels = Math.max(maxTexturePixels, pixels);
        }

        result.textureBytes = textureBytes;
        result.maxTextureWidth = maxTextureWidth || null;
        result.maxTextureHeight = maxTextureHeight || null;
        result.maxTexturePixels = maxTexturePixels || null;
        result.cacheWeight = computeCacheWeight(result);
    } catch (e) {
        console.log("[ASSET METRICS] geometry read failed:", diskPath, e?.message || e);
    }

    return result;
}

export async function computeAssetMetrics(asset, apiRoot) {
    const inputRel = normalizeUrlPath(asset?.url);
    if (!inputRel) {
        return makeEmptyMetrics();
    }

    const inputDisk = path.resolve(apiRoot, inputRel);
    return await computeGeometryMetricsFromFile(inputDisk);
}

