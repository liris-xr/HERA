// assetPipelineNodes.js
import { fetchAssetManifest, pickVariantFromManifest } from "@/js/threeExt/assetManifest.js";
import { getResource } from "@/js/endpoints.js";



export function InputAssetNode() {
    return {
        id: "InputAsset",
        requires: [],
        provides: ["input.asset"],

        async run(ctx, state) {
            const asset = state?.input?.asset ?? ctx?.asset ?? null;

            if (!asset) {
                throw new Error("[InputAssetNode] ctx.asset/state.input.asset is missing");
            }

            return {
                input: {
                    asset,
                },
            };
        },
    };
}

export function ResolveAssetUrlNode() {
    return {
        id: "ResolveAssetUrl",
        requires: ["input.asset"],
        provides: [
            "source.manifest",
            "source.url",
            "source.variant",
            "source.fromUpload",
        ],

        async run(ctx, state) {
            const asset = state.input.asset;
            const variantOverride = ctx?.options?.variantOverride ?? null;
            const token = ctx?.options?.token ?? null;

            console.log("[ResolveAssetUrlNode] asset.id =", asset.id);
            console.log("[ResolveAssetUrlNode] variantOverride =", variantOverride);
            console.log("[ResolveAssetUrlNode] token present =", !!token);

            if (asset.uploadData) {
                console.log("[ResolveAssetUrlNode] upload asset -> load from upload");
                return {
                    source: {
                        manifest: null,
                        url: null,
                        fromUpload: true,
                        variant: "original",
                    },
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
                source: {
                    manifest,
                    url: finalUrl,
                    fromUpload: false,
                    variant: chosen.variant,
                },
            };
        },
    };
}

export function AssetMetricNode() {
    return {
        id: "AssetMetric",
        requires: ["input.asset"],
        provides: ["metrics.assetSizeBytes"],

        async run(ctx, state) {
            const manifestSize = state?.source?.manifest?.metrics?.assetSizeBytes ?? null;
            const uploadSize = state?.input?.asset?.uploadData?.size ?? null;
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

export function DecodeNode() {
    return {
        id: "Decode",
        requires: ["input.asset"],
        provides: ["resource.object3D"],

        async run(ctx, state, services) {
            const asset = state.input.asset;
            const url = state?.source?.url ?? null;
            const fromUpload = !!state?.source?.fromUpload;

            console.log("[DecodeNode] source =", {
                url,
                fromUpload,
                variant: state?.source?.variant ?? null,
            });


            const object3D = await services.resourceLoader.load({
                asset,
                url,
                fromUpload,
                state,
                ctx,
            });

            if (!object3D) {
                throw new Error("[DecodeNode] resourceLoader.load() returned null/undefined.");
            }

            return {
                resource: {
                    object3D,
                },
            };
        },
    };
}

export function RenderNode() {
    return {
        id: "Render",
        requires: ["resource.object3D"],
        provides: [],

        async run(ctx, state) {
            if (!ctx?.scene) {
                throw new Error("[RenderNode] ctx.scene missing");
            }

            const object3D = state?.resource?.object3D ?? null;
            if (!object3D) {
                throw new Error("[RenderNode] resource.object3D missing");
            }

            ctx.scene.add(object3D);
            return {};
        },
    };
}