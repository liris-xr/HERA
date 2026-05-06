import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import {
    computeAssetMetrics,
    computeGeometryMetricsFromFile,
} from "../../socket/utils/assetMetrics.js";
import {
    normalizePath,
    fileExists,
    toInputRel,
    makeVariantRel,
    buildVariantSet,
} from "./variantSet.js";

const TEXTURE_LOD_PRESETS = Object.freeze({
    original: Object.freeze({ suffix: "compressed", maxTextureSize: 2048, quality: 82, effort: 75 }),
    n1: Object.freeze({ suffix: "tex_n1", maxTextureSize: 1536, quality: 78, effort: 70 }),
    n2: Object.freeze({ suffix: "tex_n2", maxTextureSize: 1024, quality: 72, effort: 65 }),
    n3: Object.freeze({ suffix: "tex_n3", maxTextureSize: 512, quality: 66, effort: 60 }),
});

function run(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            cwd,
            shell: process.platform === "win32",
            windowsHide: true,
        });

        let out = "";
        let err = "";

        child.stdout.on("data", (d) => (out += d.toString()));
        child.stderr.on("data", (d) => (err += d.toString()));
        child.on("error", reject);

        child.on("close", (code) => {
            if (code === 0) return resolve({ out, err });
            reject(new Error(`command failed (code=${code})\n${err || out}`));
        });
    });
}

function ensureParentDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function safeUnlink(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch {}
}

function withDefaultMetricShape(metrics = {}) {
    return {
        assetSizeBytes: metrics.assetSizeBytes ?? null,
        triangleCount: metrics.triangleCount ?? null,
        vertexCount: metrics.vertexCount ?? null,
        meshCount: metrics.meshCount ?? null,
        textureCount: metrics.textureCount ?? null,
        textureBytes: metrics.textureBytes ?? null,
        maxTextureWidth: metrics.maxTextureWidth ?? null,
        maxTextureHeight: metrics.maxTextureHeight ?? null,
        maxTexturePixels: metrics.maxTexturePixels ?? null,
        cacheWeight: metrics.cacheWeight ?? null,
    };
}

function getGltfTransformCmd(apiRoot) {
    return process.platform === "win32"
        ? path.join(apiRoot, "node_modules", ".bin", "gltf-transform.cmd")
        : path.join(apiRoot, "node_modules", ".bin", "gltf-transform");
}

function normalizeTextureFormat(format) {
    const value = String(format || "webp").toLowerCase();
    if (value === "webp" || value === "etc1s" || value === "uastc") return value;
    return "webp";
}

function buildPreset(key, params = {}) {
    return {
        ...TEXTURE_LOD_PRESETS[key],
        ...(params.textureLods?.[key] ?? {}),
    };
}

async function runResize({
    gltfTransformCmd,
    apiRoot,
    inputDisk,
    outputDisk,
    maxTextureSize,
}) {
    ensureParentDir(outputDisk);

    await run(
        gltfTransformCmd,
        [
            "resize",
            inputDisk,
            outputDisk,
            "--width",
            String(maxTextureSize),
            "--height",
            String(maxTextureSize),
        ],
        apiRoot
    );

    if (!fileExists(outputDisk)) {
        throw new Error(`resize did not produce output file: ${outputDisk}`);
    }
}

async function runTextureCompress({
    gltfTransformCmd,
    apiRoot,
    inputDisk,
    outputDisk,
    format,
    quality,
    effort,
    level,
}) {
    ensureParentDir(outputDisk);

    const args = [format, inputDisk, outputDisk];

    if (format === "webp") {
        args.push("--quality", String(quality));
        args.push("--effort", String(effort));
    } else if (format === "etc1s") {
        args.push("--quality", String(quality ?? 128));
    } else if (format === "uastc") {
        args.push("--level", String(level ?? 2));
    }

    await run(gltfTransformCmd, args, apiRoot);

    if (!fileExists(outputDisk)) {
        throw new Error(`texture compression did not produce output file: ${outputDisk}`);
    }
}

async function createTextureLod({
    apiRoot,
    gltfTransformCmd,
    inputDisk,
    outputDisk,
    tmpDir,
    assetId,
    variantKey,
    format,
    preset,
    tmpFiles,
}) {
    safeUnlink(outputDisk);

    const resizedDisk = path.join(
        tmpDir,
        `${assetId}-${Date.now()}-${variantKey}-resize.glb`
    );
    tmpFiles.push(resizedDisk);

    await runResize({
        gltfTransformCmd,
        apiRoot,
        inputDisk,
        outputDisk: resizedDisk,
        maxTextureSize: preset.maxTextureSize,
    });

    await runTextureCompress({
        gltfTransformCmd,
        apiRoot,
        inputDisk: resizedDisk,
        outputDisk,
        format,
        quality: preset.quality,
        effort: preset.effort,
        level: preset.level,
    });
}

export async function compressTexturesAsset({ asset, params = {}, apiRoot }) {
    const tmpFiles = [];

    if (!asset?.url) {
        throw new Error("Asset url missing");
    }

    const inputRel = toInputRel(asset.url);
    const inputDisk = path.resolve(apiRoot, inputRel);

    if (!fileExists(inputDisk)) {
        throw new Error(`Original file not found on disk: ${inputDisk}`);
    }

    const gltfTransformCmd = getGltfTransformCmd(apiRoot);
    if (!fileExists(gltfTransformCmd)) {
        throw new Error(`gltf-transform not found: ${gltfTransformCmd}`);
    }

    const format = normalizeTextureFormat(params.format ?? params.texture?.format ?? "webp");
    const tmpDir = path.join(apiRoot, ".tmp-lod");
    fs.mkdirSync(tmpDir, { recursive: true });

    const originalRel = makeVariantRel(inputRel, TEXTURE_LOD_PRESETS.original.suffix);
    const n1Rel = makeVariantRel(inputRel, TEXTURE_LOD_PRESETS.n1.suffix);
    const n2Rel = makeVariantRel(inputRel, TEXTURE_LOD_PRESETS.n2.suffix);
    const n3Rel = makeVariantRel(inputRel, TEXTURE_LOD_PRESETS.n3.suffix);

    const outputMap = {
        original: {
            rel: originalRel,
            disk: path.resolve(apiRoot, originalRel),
            preset: buildPreset("original", params),
        },
        n1: {
            rel: n1Rel,
            disk: path.resolve(apiRoot, n1Rel),
            preset: buildPreset("n1", params),
        },
        n2: {
            rel: n2Rel,
            disk: path.resolve(apiRoot, n2Rel),
            preset: buildPreset("n2", params),
        },
        n3: {
            rel: n3Rel,
            disk: path.resolve(apiRoot, n3Rel),
            preset: buildPreset("n3", params),
        },
    };

    const beforeMetrics = withDefaultMetricShape(
        await computeAssetMetrics(asset, apiRoot)
    );

    try {
        for (const [variantKey, output] of Object.entries(outputMap)) {
            await createTextureLod({
                apiRoot,
                gltfTransformCmd,
                inputDisk,
                outputDisk: output.disk,
                tmpDir,
                assetId: asset.id,
                variantKey,
                format,
                preset: output.preset,
                tmpFiles,
            });
        }

        const metrics = {};

        for (const [variantKey, output] of Object.entries(outputMap)) {
            metrics[variantKey] = withDefaultMetricShape(
                await computeGeometryMetricsFromFile(output.disk)
            );
        }

        asset.simplifiedUrl = outputMap.n1.rel;
        asset.preferredVariant = "original";
        asset.lodMeta = {
            generator: "gltf-transform",
            strategy: "compressTextures",
            mode: "texture-only-lods",
            generatedAt: new Date().toISOString(),
            source: {
                path: normalizePath(inputRel),
                ...beforeMetrics,
                status: fileExists(inputDisk) ? "ready" : "missing",
            },
            original: {
                path: normalizePath(outputMap.original.rel),
                textureOnly: true,
                format,
                maxTextureSize: outputMap.original.preset.maxTextureSize,
                quality: outputMap.original.preset.quality,
                effort: outputMap.original.preset.effort,
                ...metrics.original,
                status: fileExists(outputMap.original.disk) ? "ready" : "missing",
            },
            variants: {
                n1: {
                    path: normalizePath(outputMap.n1.rel),
                    textureOnly: true,
                    format,
                    maxTextureSize: outputMap.n1.preset.maxTextureSize,
                    quality: outputMap.n1.preset.quality,
                    effort: outputMap.n1.preset.effort,
                    ...metrics.n1,
                    status: fileExists(outputMap.n1.disk) ? "ready" : "missing",
                },
                n2: {
                    path: normalizePath(outputMap.n2.rel),
                    textureOnly: true,
                    format,
                    maxTextureSize: outputMap.n2.preset.maxTextureSize,
                    quality: outputMap.n2.preset.quality,
                    effort: outputMap.n2.preset.effort,
                    ...metrics.n2,
                    status: fileExists(outputMap.n2.disk) ? "ready" : "missing",
                },
                n3: {
                    path: normalizePath(outputMap.n3.rel),
                    textureOnly: true,
                    format,
                    maxTextureSize: outputMap.n3.preset.maxTextureSize,
                    quality: outputMap.n3.preset.quality,
                    effort: outputMap.n3.preset.effort,
                    ...metrics.n3,
                    status: fileExists(outputMap.n3.disk) ? "ready" : "missing",
                },
            },
        };

        await asset.save();

        const variants = buildVariantSet(asset, apiRoot);

        return {
            asset: {
                id: asset.id,
                url: asset.url,
                simplifiedUrl: asset.simplifiedUrl,
                preferredVariant: asset.preferredVariant,
                lodMeta: asset.lodMeta,
            },
            strategyResult: {
                strategy: "compressTextures",
                ok: true,
                mode: "texture-only-lods",
                format,
            },
            metrics: {
                before: beforeMetrics,
                after: metrics,
            },
            variants,
            lodMeta: asset.lodMeta,
            outputs: {
                original: { path: normalizePath(outputMap.original.rel) },
                n1: { path: normalizePath(outputMap.n1.rel) },
                n2: { path: normalizePath(outputMap.n2.rel) },
                n3: { path: normalizePath(outputMap.n3.rel) },
            },
        };
    } finally {
        for (const filePath of tmpFiles) {
            safeUnlink(filePath);
        }
    }
}
