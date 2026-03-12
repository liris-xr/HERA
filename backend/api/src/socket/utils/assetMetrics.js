import path from "node:path";
import fs from "node:fs";

function normalizeUrlPath(u) {
    return String(u ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function computeAssetMetrics(asset, apiRoot) {
    const inputRel = normalizeUrlPath(asset?.url);
    if (!inputRel) {
        return {
            assetSizeBytes: null,
        };
    }

    const inputDisk = path.resolve(apiRoot, inputRel);

    let assetSizeBytes = null;

    try {
        const stat = fs.statSync(inputDisk);
        if (stat.isFile()) assetSizeBytes = stat.size;
    } catch {
        assetSizeBytes = null;
    }

    return {
        assetSizeBytes,
    };
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