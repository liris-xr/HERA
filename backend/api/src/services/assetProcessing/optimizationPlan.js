import { computeAssetMetrics } from "../../socket/utils/assetMetrics.js";

function clampNumber(value, fallback, min = -Infinity, max = Infinity) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function makeInitialState({ asset, params = {}, apiRoot }) {
    return {
        input: { asset, params, apiRoot },
        metrics: null,
        policies: {
            texture: null,
            geometry: null,
            runtimeCache: null,
        },
        plan: null,
        runtime: {
            executedNodes: [],
        },
    };
}

export function buildDefaultGeometryPresets(triangleCount, params = {}) {
    const count = Number(triangleCount);
    const targetTriangles = {
        n1: clampNumber(params.targetTriangles?.n1, 120000, 1000),
        n2: clampNumber(params.targetTriangles?.n2, 60000, 1000),
        n3: clampNumber(params.targetTriangles?.n3, 25000, 1000),
    };

    const base = {
        n1: { ratio: 0.55, error: 0.03, lockBorder: true },
        n2: { ratio: 0.28, error: 0.25, lockBorder: true },
        n3: { ratio: 0.12, error: 1, lockBorder: true },
    };

    if (!Number.isFinite(count) || count <= 0) {
        return base;
    }

    return Object.fromEntries(
        Object.entries(base).map(([key, preset]) => {
            const targetRatio = targetTriangles[key] / count;
            return [
                key,
                {
                    ...preset,
                    ratio: Number(Math.max(0.015, Math.min(preset.ratio, targetRatio)).toFixed(4)),
                    targetTriangles: targetTriangles[key],
                },
            ];
        })
    );
}

async function runNodes(state, nodes) {
    for (const node of nodes) {
        const patch = await node.run(state);
        Object.assign(state, patch ?? {});
        state.runtime.executedNodes.push(node.id);
    }

    return state;
}

function InputAssetNode() {
    return {
        id: "InputAsset",
        async run(state) {
            if (!state.input.asset?.url) {
                throw new Error("[InputAssetNode] Asset url missing");
            }

            return {};
        },
    };
}

function AnalyzeAssetNode() {
    return {
        id: "AnalyzeAsset",
        async run(state) {
            const metrics = await computeAssetMetrics(
                state.input.asset,
                state.input.apiRoot
            );

            return { metrics };
        },
    };
}

function TexturePolicyNode() {
    return {
        id: "TexturePolicy",
        async run(state) {
            const metrics = state.metrics ?? {};
            const params = state.input.params?.texture ?? {};

            const maxTextureSize = clampNumber(params.maxTextureSize, 2048, 256, 8192);
            const textureBytesThreshold = clampNumber(
                params.textureBytesThreshold,
                2 * 1024 * 1024,
                0
            );
            const format = params.format ?? "webp";

            const reasons = [];

            if ((metrics.maxTextureWidth ?? 0) > maxTextureSize) {
                reasons.push(`maxTextureWidth>${maxTextureSize}`);
            }

            if ((metrics.maxTextureHeight ?? 0) > maxTextureSize) {
                reasons.push(`maxTextureHeight>${maxTextureSize}`);
            }

            if ((metrics.textureBytes ?? 0) > textureBytesThreshold) {
                reasons.push(`textureBytes>${textureBytesThreshold}`);
            }

            const shouldCompress = (metrics.textureCount ?? 0) > 0 && reasons.length > 0;

            return {
                policies: {
                    ...state.policies,
                    texture: {
                        shouldCompress,
                        format,
                        maxTextureSize,
                        textureBytesThreshold,
                        reasons,
                    },
                },
            };
        },
    };
}

function GeometryPolicyNode() {
    return {
        id: "GeometryPolicy",
        async run(state) {
            const metrics = state.metrics ?? {};
            const params = state.input.params?.geometry ?? {};

            const triangleCount = metrics.triangleCount ?? 0;
            const forceGenerateVariants = state.input.params?.generateVariants === true;
            const shouldSimplify = forceGenerateVariants || triangleCount > clampNumber(
                params.triangleThreshold,
                10000,
                0
            );

            const presets = params.errorPresets ?? buildDefaultGeometryPresets(
                triangleCount,
                params
            );

            const reasons = [];
            if (forceGenerateVariants) reasons.push("generateVariants=true");
            if (triangleCount > (params.triangleThreshold ?? 10000)) {
                reasons.push(`triangleCount>${params.triangleThreshold ?? 10000}`);
            }

            return {
                policies: {
                    ...state.policies,
                    geometry: {
                        shouldSimplify,
                        triangleThreshold: params.triangleThreshold ?? 10000,
                        presets,
                        reasons,
                    },
                },
            };
        },
    };
}

function RuntimeCachePolicyNode() {
    return {
        id: "RuntimeCachePolicy",
        async run(state) {
            const cacheWeight = state.metrics?.cacheWeight ?? null;
            const weight = Number(cacheWeight ?? Infinity);

            const cacheAllSafe = Number.isFinite(weight) && weight <= 2;

            const recommendedDecodedLimit = {
                lowMobile: weight <= 1.5 ? 1 : 0,
                midMobile: weight <= 2.5 ? 2 : 1,
                highMobile: weight <= 4 ? 3 : 2,
                desktop: cacheAllSafe ? 4 : 3,
            };

            return {
                policies: {
                    ...state.policies,
                    runtimeCache: {
                        cacheWeight,
                        cacheAllSafe,
                        recommendedDecodedLimit,
                    },
                },
            };
        },
    };
}

function OptimizationPlanNode() {
    return {
        id: "OptimizationPlan",
        async run(state) {
            const nextActions = [];

            if (state.policies.texture?.shouldCompress) {
                nextActions.push("compressTextures");
            }

            if (state.policies.geometry?.shouldSimplify) {
                nextActions.push("simplify");
            }

            return {
                plan: {
                    strategy: "optimizationPlan",
                    generatedAt: new Date().toISOString(),
                    metrics: state.metrics,
                    policies: state.policies,
                    nextActions,
                },
            };
        },
    };
}

export async function planAssetOptimization({ asset, params = {}, apiRoot }) {
    const state = makeInitialState({ asset, params, apiRoot });
    const nodes = [
        InputAssetNode(),
        AnalyzeAssetNode(),
        TexturePolicyNode(),
        GeometryPolicyNode(),
        RuntimeCachePolicyNode(),
        OptimizationPlanNode(),
    ];

    const finalState = await runNodes(state, nodes);

    return {
        asset: {
            id: asset.id,
            url: asset.url,
            preferredVariant: asset.preferredVariant ?? "original",
        },
        plan: finalState.plan,
        executedNodes: finalState.runtime.executedNodes,
    };
}
