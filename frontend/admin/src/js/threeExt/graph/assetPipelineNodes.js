import { fetchAssetManifest, pickVariantFromManifest } from "@/js/threeExt/assetManifest.js";
import { getResource } from "@/js/endpoints.js";

export function InputAssetNode() {
    return {
        id: "InputAsset",
        async run(ctx) {
            if (!ctx?.asset) throw new Error("[InputAssetNode] ctx.asset is missing");
            return { asset: ctx.asset };
        },
    };
}
export function ResolveAssetUrlNode() {
    return {
        id: "ResolveAssetUrl",
        async run(ctx, data) {
            const asset = data?.asset ?? ctx.asset;
            if (!asset) throw new Error("[ResolveAssetUrlNode] asset missing");

            const variantOverride = ctx?.options?.variantOverride ?? null;
            const token = ctx?.options?.token ?? null;
            console.log("[ResolveAssetUrlNode] asset.id =", asset.id);
            console.log("[ResolveAssetUrlNode] variantOverride =", variantOverride);
            console.log("[ResolveAssetUrlNode] token present =", !!token);
            console.log("[ResolveAssetUrlNode] ctx.options =", ctx?.options);
            if (asset.uploadData) {
                console.log("[ResolveAssetUrlNode] upload asset -> load from upload");
                return {
                    urlToLoad: null,
                    loadFromUpload: true,
                    variant: "original",
                };
            }

            const manifest = await fetchAssetManifest(asset.id, token);

            const chosen = pickVariantFromManifest(manifest, {
                variantOverride,
                allowFallback: true,
            });

            const finalUrl = getResource(chosen.path);

            console.log("[ResolveAssetUrlNode] asset:", asset.id);
            console.log("[ResolveAssetUrlNode] chosen variant:", chosen.variant);
            console.log("[ResolveAssetUrlNode] chosen path:", chosen.path);
            console.log("[ResolveAssetUrlNode] final url:", finalUrl);

            return {
                manifest,
                urlToLoad: finalUrl,
                loadFromUpload: false,
                variant: chosen.variant,
            };
        },
    };
}

export function AssetMetricNode() {
    return {
        id: "AssetMetric",
        async run(ctx, data) {
            const manifestSize = data?.manifest?.metrics?.assetSizeBytes ?? null;
            const uploadSize = data?.asset?.uploadData?.size ?? null;

            const assetSizeBytes = manifestSize ?? uploadSize ?? null;

            console.log("[AssetMetricNode]", {
                manifestSize,
                uploadSize,
                final: assetSizeBytes,
            });

            return {
                metrics: {
                    assetSizeBytes,
                },
            };
        },
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function computeRecommendedSimplifyRatio(sizeBytes, options = {}) {

    const {
        minBytes = 5 * 1024 * 1024,
        maxBytes = 200 * 1024 * 1024,
        minRatio = 0.25,
        maxRatio = 1.0,
        fallbackRatio = 1.0,
        roundDigits = 2,
    } = options;

    const size = Number(sizeBytes);

    if (!Number.isFinite(size) || size <= 0) {
        return fallbackRatio;
    }

    const t = clamp((size - minBytes) / (maxBytes - minBytes), 0, 1);

    const ratio = lerp(maxRatio, minRatio, t);

    return Number(ratio.toFixed(roundDigits));
}

export function SimplificationPolicyNode() {
    return {
        id: "SimplificationPolicy",
        async run(ctx, data) {

            const manifestRatio = data?.manifest?.policy?.recommendedSimplifyRatio ?? null;

            const localRatio = computeRecommendedSimplifyRatio(
                data?.metrics?.assetSizeBytes
            );

            const recommendedSimplifyRatio = manifestRatio ?? localRatio;

            console.log("[SimplificationPolicyNode]", {
                manifestRatio,
                localRatio,
                final: recommendedSimplifyRatio,
            });

            return {
                policy: {
                    recommendedSimplifyRatio,
                },
            };
        },
    };
}
export function DecodeNode() {
    return {
        id: "Decode",

        async run(ctx, data) {
            console.log("[SimplificationPolicyNode]", data?.manifest?.policy);
            const asset = data?.asset ?? ctx.asset;
            if (!asset) throw new Error("[DecodeNode] asset missing");

            const options = {
                ...(ctx?.options ?? {}),
                urlOverride: data?.urlToLoad ?? null,
                forceUpload: !!data?.loadFromUpload,
            };

            const object3D = await asset.load(options);
            if (!object3D) {
                throw new Error("[DecodeNode] asset.load() returned null/undefined.");
            }

            return { object3D };
        },
    };
}

export function RenderNode() {
    return {
        id: "Render",
        async run(ctx, data) {
            if (!ctx?.scene) throw new Error("[RenderNode] ctx.scene missing");
            if (!data?.object3D) throw new Error("[RenderNode] object3D missing");

            ctx.scene.add(data.object3D);

            //if (ctx.onAdd) ctx.onAdd(ctx.asset);
            return {};
        },
    };
}