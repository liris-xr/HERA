import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import {
    computeAssetMetrics,
    computeGeometryMetricsFromFile,
} from "../../socket/utils/assetMetrics.js";
import { planAssetOptimization } from "../assetProcessing/optimizationPlan.js";
import {
    normalizePath,
    fileExists,
    toInputRel,
    makeVariantRel,
    buildVariantSet,
} from "./variantSet.js";

const LOD_VARIANTS = Object.freeze(["n1", "n2", "n3"]);

const DEFAULT_TEXTURE_PARAMS = Object.freeze({
    format: "webp",
    maxTextureSize: 2048,
    textureBytesThreshold: 2 * 1024 * 1024,
    quality: 82,
    effort: 75,
});

const DEFAULT_ERROR_PRESETS = Object.freeze({
    n1: Object.freeze({ ratio: 0.55, error: 0.03, lockBorder: true }),
    n2: Object.freeze({ ratio: 0.28, error: 0.25, lockBorder: true }),
    n3: Object.freeze({ ratio: 0.12, error: 1, lockBorder: true }),
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

function copyIfNeeded(inputDisk, outputDisk) {
    if (inputDisk === outputDisk) return;
    ensureParentDir(outputDisk);
    fs.copyFileSync(inputDisk, outputDisk);
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

function parseLodMeta(raw) {
    if (!raw) return {};
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw) ?? {};
        } catch {
            return {};
        }
    }
    return typeof raw === "object" ? raw : {};
}

function getGltfTransformCmd(apiRoot) {
    return process.platform === "win32"
        ? path.join(apiRoot, "node_modules", ".bin", "gltf-transform.cmd")
        : path.join(apiRoot, "node_modules", ".bin", "gltf-transform");
}

function normalizeTextureFormat(format) {
    const value = String(format || "webp").toLowerCase();
    if (value === "etc1s" || value === "uastc" || value === "webp") {
        return value;
    }
    return "webp";
}

function shouldResizeTextures(metrics, textureParams) {
    const maxTextureSize = Number(textureParams.maxTextureSize);
    if (!Number.isFinite(maxTextureSize) || maxTextureSize <= 0) return false;

    return (
        (metrics.maxTextureWidth ?? 0) > maxTextureSize ||
        (metrics.maxTextureHeight ?? 0) > maxTextureSize
    );
}

function shouldCompressTextures(plan, textureParams) {
    if (textureParams.force === true) return true;
    return !!plan?.policies?.texture?.shouldCompress;
}

function buildTextureParams(params = {}) {
    return {
        ...DEFAULT_TEXTURE_PARAMS,
        ...(params.texture ?? {}),
    };
}

function buildGeometryPresets(params = {}, plan = {}) {
    return (
        params.geometry?.errorPresets ??
        plan?.policies?.geometry?.presets ??
        DEFAULT_ERROR_PRESETS
    );
}

async function runResize({ gltfTransformCmd, apiRoot, inputDisk, outputDisk, maxTextureSize }) {
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
    textureParams,
}) {
    ensureParentDir(outputDisk);

    const format = normalizeTextureFormat(textureParams.format);
    const args = [format, inputDisk, outputDisk];

    if (format === "webp") {
        args.push("--quality", String(textureParams.quality ?? 82));
        args.push("--effort", String(textureParams.effort ?? 75));
    } else if (format === "etc1s") {
        args.push("--quality", String(textureParams.quality ?? 128));
    } else if (format === "uastc") {
        args.push("--level", String(textureParams.level ?? 2));
        if (textureParams.rdo === true) args.push("--rdo");
    }

    await run(gltfTransformCmd, args, apiRoot);

    if (!fileExists(outputDisk)) {
        throw new Error(`texture compression did not produce output file: ${outputDisk}`);
    }
}

async function runWeld({ gltfTransformCmd, apiRoot, inputDisk, outputDisk }) {
    ensureParentDir(outputDisk);
    await run(gltfTransformCmd, ["weld", inputDisk, outputDisk], apiRoot);

    if (!fileExists(outputDisk)) {
        throw new Error(`weld did not produce output file: ${outputDisk}`);
    }
}

async function runSimplifyLevel({
    gltfTransformCmd,
    apiRoot,
    inputDisk,
    outputDisk,
    preset,
}) {
    ensureParentDir(outputDisk);

    await run(
        gltfTransformCmd,
        [
            "simplify",
            inputDisk,
            outputDisk,
            "--ratio",
            String(preset.ratio ?? 0),
            "--error",
            String(preset.error),
            "--lock-border",
            String(preset.lockBorder ?? true),
        ],
        apiRoot
    );

    if (!fileExists(outputDisk)) {
        throw new Error(`simplify did not produce output file: ${outputDisk}`);
    }
}

async function runPipeline(state, nodes) {
    for (const node of nodes) {
        await node.run(state);
        state.executedNodes.push(node.id);
    }
    return state;
}

function InputAssetNode() {
    return {
        id: "InputAsset",
        async run(state) {
            if (!state.asset?.url) {
                throw new Error("[OptimizeAsset/InputAsset] Asset url missing");
            }
        },
    };
}

function PlanNode() {
    return {
        id: "Plan",
        async run(state) {
            state.planResult = await planAssetOptimization({
                asset: state.asset,
                params: state.params,
                apiRoot: state.apiRoot,
            });
        },
    };
}

function ResolvePathsNode() {
    return {
        id: "ResolvePaths",
        async run(state) {
            const sourceRel = toInputRel(state.asset.url);
            const sourceDisk = path.resolve(state.apiRoot, sourceRel);

            if (!fileExists(sourceDisk)) {
                throw new Error(`Original file not found on disk: ${sourceDisk}`);
            }

            const gltfTransformCmd = getGltfTransformCmd(state.apiRoot);
            if (!fileExists(gltfTransformCmd)) {
                throw new Error(`gltf-transform not found: ${gltfTransformCmd}`);
            }

            const tmpDir = path.join(state.apiRoot, ".tmp-lod");
            fs.mkdirSync(tmpDir, { recursive: true });

            const optimizedRel = makeVariantRel(sourceRel, "optimized");
            const variantRels = Object.fromEntries(
                LOD_VARIANTS.map((key) => [key, makeVariantRel(sourceRel, key)])
            );

            state.paths = {
                sourceRel,
                sourceDisk,
                optimizedRel,
                optimizedDisk: path.resolve(state.apiRoot, optimizedRel),
                variantRels,
                variantDisks: Object.fromEntries(
                    LOD_VARIANTS.map((key) => [
                        key,
                        path.resolve(state.apiRoot, variantRels[key]),
                    ])
                ),
                tmpDir,
                gltfTransformCmd,
            };
        },
    };
}

function OptimizedOriginalNode() {
    return {
        id: "OptimizedOriginal",
        async run(state) {
            const plan = state.planResult?.plan ?? {};
            const metrics = plan.metrics ?? {};
            const textureParams = buildTextureParams(state.params);
            const needsResize = shouldResizeTextures(metrics, textureParams);
            const needsCompress = shouldCompressTextures(plan, textureParams);

            state.textureResult = {
                optimized: false,
                format: normalizeTextureFormat(textureParams.format),
                resized: false,
                compressed: false,
                reasons: plan?.policies?.texture?.reasons ?? [],
            };

            if (!needsResize && !needsCompress) {
                state.base = {
                    rel: state.paths.sourceRel,
                    disk: state.paths.sourceDisk,
                    originalWasOptimized: false,
                };
                return;
            }

            safeUnlink(state.paths.optimizedDisk);

            let currentDisk = state.paths.sourceDisk;

            if (needsResize) {
                const resizedDisk = needsCompress
                    ? path.join(state.paths.tmpDir, `${state.asset.id}-${Date.now()}-resized.glb`)
                    : state.paths.optimizedDisk;

                if (needsCompress) {
                    state.tmpFiles.push(resizedDisk);
                }

                await runResize({
                    gltfTransformCmd: state.paths.gltfTransformCmd,
                    apiRoot: state.apiRoot,
                    inputDisk: currentDisk,
                    outputDisk: resizedDisk,
                    maxTextureSize: textureParams.maxTextureSize,
                });

                currentDisk = resizedDisk;
                state.textureResult.resized = true;
            }

            if (needsCompress) {
                await runTextureCompress({
                    gltfTransformCmd: state.paths.gltfTransformCmd,
                    apiRoot: state.apiRoot,
                    inputDisk: currentDisk,
                    outputDisk: state.paths.optimizedDisk,
                    textureParams,
                });

                state.textureResult.compressed = true;
            } else if (currentDisk !== state.paths.optimizedDisk) {
                copyIfNeeded(currentDisk, state.paths.optimizedDisk);
            }

            state.textureResult.optimized = true;
            state.base = {
                rel: state.paths.optimizedRel,
                disk: state.paths.optimizedDisk,
                originalWasOptimized: true,
            };
        },
    };
}

function GenerateLodVariantsNode() {
    return {
        id: "GenerateLodVariants",
        async run(state) {
            const generateVariants = state.params.generateVariants !== false;
            state.variantResult = { generated: false, presets: {} };

            if (!generateVariants) return;

            for (const variantDisk of Object.values(state.paths.variantDisks)) {
                safeUnlink(variantDisk);
            }

            const weldedDisk = path.join(
                state.paths.tmpDir,
                `${state.asset.id}-${Date.now()}-welded.glb`
            );
            state.tmpFiles.push(weldedDisk);

            await runWeld({
                gltfTransformCmd: state.paths.gltfTransformCmd,
                apiRoot: state.apiRoot,
                inputDisk: state.base.disk,
                outputDisk: weldedDisk,
            });

            const presets = buildGeometryPresets(
                state.params,
                state.planResult?.plan ?? {}
            );

            for (const key of LOD_VARIANTS) {
                const preset = {
                    ...DEFAULT_ERROR_PRESETS[key],
                    ...(presets[key] ?? {}),
                };

                await runSimplifyLevel({
                    gltfTransformCmd: state.paths.gltfTransformCmd,
                    apiRoot: state.apiRoot,
                    inputDisk: weldedDisk,
                    outputDisk: state.paths.variantDisks[key],
                    preset,
                });

                state.variantResult.presets[key] = preset;
            }

            state.variantResult.generated = true;
        },
    };
}

function MeasureOutputsNode() {
    return {
        id: "MeasureOutputs",
        async run(state) {
            const originalMetrics = withDefaultMetricShape(
                await computeGeometryMetricsFromFile(state.base.disk)
            );

            const variantMetrics = {};
            await Promise.all(
                LOD_VARIANTS.map(async (key) => {
                    const disk = state.paths.variantDisks[key];
                    variantMetrics[key] = fileExists(disk)
                        ? withDefaultMetricShape(await computeGeometryMetricsFromFile(disk))
                        : withDefaultMetricShape();
                })
            );

            state.outputMetrics = {
                source: withDefaultMetricShape(
                    state.planResult?.plan?.metrics ?? await computeAssetMetrics(state.asset, state.apiRoot)
                ),
                original: originalMetrics,
                variants: variantMetrics,
            };
        },
    };
}

function PersistMetaNode() {
    return {
        id: "PersistMeta",
        async run(state) {
            const previousMeta = parseLodMeta(state.asset.lodMeta);
            const previousExtraVariants = Object.fromEntries(
                Object.entries(previousMeta.variants ?? {}).filter(
                    ([key]) => !LOD_VARIANTS.includes(key)
                )
            );

            const variants = {
                ...previousExtraVariants,
            };

            for (const key of LOD_VARIANTS) {
                const disk = state.paths.variantDisks[key];
                variants[key] = {
                    path: normalizePath(state.paths.variantRels[key]),
                    requestedRatio: state.variantResult.presets[key]?.ratio ?? null,
                    requestedError: state.variantResult.presets[key]?.error ?? null,
                    requestedLockBorder: state.variantResult.presets[key]?.lockBorder ?? true,
                    ...state.outputMetrics.variants[key],
                    status: fileExists(disk) ? "ready" : "missing",
                };
            }

            state.asset.simplifiedUrl = state.paths.variantRels.n1;
            state.asset.preferredVariant = "original";
            state.asset.lodMeta = {
                generator: "hera-asset-optimizer",
                strategy: "optimizeAsset",
                mode: "policy",
                generatedAt: new Date().toISOString(),
                executedNodes: state.executedNodes,
                planExecutedNodes: state.planResult?.executedNodes ?? [],
                plan: state.planResult?.plan ?? null,
                source: {
                    path: normalizePath(state.paths.sourceRel),
                    ...state.outputMetrics.source,
                    status: fileExists(state.paths.sourceDisk) ? "ready" : "missing",
                },
                original: {
                    path: normalizePath(state.base.rel),
                    optimized: state.base.originalWasOptimized,
                    texture: state.textureResult,
                    ...state.outputMetrics.original,
                    status: fileExists(state.base.disk) ? "ready" : "missing",
                },
                variants,
            };

            await state.asset.save();
        },
    };
}

function ResponseNode() {
    return {
        id: "Response",
        async run(state) {
            state.response = {
                asset: {
                    id: state.asset.id,
                    url: state.asset.url,
                    simplifiedUrl: state.asset.simplifiedUrl,
                    preferredVariant: state.asset.preferredVariant,
                    lodMeta: state.asset.lodMeta,
                },
                strategyResult: {
                    strategy: "optimizeAsset",
                    ok: true,
                    optimizedOriginal: state.base.originalWasOptimized,
                    generatedVariants: state.variantResult.generated,
                    texture: state.textureResult,
                },
                plan: state.planResult?.plan ?? null,
                executedNodes: state.executedNodes,
                metrics: state.outputMetrics,
                variants: buildVariantSet(state.asset, state.apiRoot),
                lodMeta: state.asset.lodMeta,
                outputs: {
                    source: { path: normalizePath(state.paths.sourceRel) },
                    original: { path: normalizePath(state.base.rel) },
                    n1: { path: normalizePath(state.paths.variantRels.n1) },
                    n2: { path: normalizePath(state.paths.variantRels.n2) },
                    n3: { path: normalizePath(state.paths.variantRels.n3) },
                },
            };
        },
    };
}

export async function optimizeAsset({ asset, params = {}, apiRoot }) {
    const geometryParams = {
        ...(params.geometry ?? {}),
    };

    if (params.geometry?.errorPresets || params.errorPresets) {
        geometryParams.errorPresets = params.geometry?.errorPresets ?? params.errorPresets;
    }

    const effectiveParams = {
        generateVariants: true,
        ...params,
        texture: {
            ...DEFAULT_TEXTURE_PARAMS,
            ...(params.texture ?? {}),
        },
        geometry: geometryParams,
    };

    const state = {
        asset,
        params: effectiveParams,
        apiRoot,
        paths: null,
        base: null,
        planResult: null,
        textureResult: null,
        variantResult: null,
        outputMetrics: null,
        response: null,
        tmpFiles: [],
        executedNodes: [],
    };

    const nodes = [
        InputAssetNode(),
        PlanNode(),
        ResolvePathsNode(),
        OptimizedOriginalNode(),
        GenerateLodVariantsNode(),
        MeasureOutputsNode(),
        PersistMetaNode(),
        ResponseNode(),
    ];

    try {
        await runPipeline(state, nodes);
        return state.response;
    } finally {
        for (const filePath of state.tmpFiles) {
            safeUnlink(filePath);
        }
    }
}
