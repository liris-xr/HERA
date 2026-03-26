import path from "node:path";
import fs from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

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

export async function computeGeometryMetricsFromFile(diskPath) {
    const result = {
        assetSizeBytes: computeFileSizeBytes(diskPath),
        triangleCount: null,
        vertexCount: null,
        meshCount: null,
    };

    try {
        const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
        const document = await io.read(diskPath);
        const root = document.getRoot();

        let triangleCount = 0;
        let vertexCount = 0;
        let meshCount = 0;

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
    } catch (e) {
        console.log("[ASSET METRICS] geometry read failed:", diskPath, e?.message || e);
    }

    return result;
}

export async function computeAssetMetrics(asset, apiRoot) {
    const inputRel = normalizeUrlPath(asset?.url);
    if (!inputRel) {
        return {
            assetSizeBytes: null,
            triangleCount: null,
            vertexCount: null,
            meshCount: null,
        };
    }

    const inputDisk = path.resolve(apiRoot, inputRel);
    return await computeGeometryMetricsFromFile(inputDisk);
}

export function computeAssetPolicy(metrics, options = {}) {
    const {
        minBytes = 5 * 1024 * 1024,
        maxBytes = 200 * 1024 * 1024,
        minRatio = 0.25,
        maxRatio = 1.0,
        fallbackRatio = 1.0,
        roundDigits = 2,
    } = options;

    const size = Number(metrics?.assetSizeBytes);

    if (!Number.isFinite(size) || size <= 0) {
        return {
            recommendedSimplifyRatio: fallbackRatio,
        };
    }

    const t = clamp((size - minBytes) / (maxBytes - minBytes), 0, 1);
    const ratio = lerp(maxRatio, minRatio, t);

    return {
        recommendedSimplifyRatio: Number(ratio.toFixed(roundDigits)),
    };
}