import { fetchAssetManifest, pickVariantFromManifest } from "@/js/threeExt/assetManifest.js";
import { getResource } from "@/js/endpoints.js";
import { detectAssetKind } from "@/js/threeExt/graph/resourceKinds.js";

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
            "source.kind",
        ],

        async run(ctx, state, services) {
            const asset = state.input.asset;
            const variantOverride = ctx?.options?.variantOverride ?? null;
            const token = ctx?.options?.token ?? null;
            const logger = services.logger;

            logger.debug("[ResolveAssetUrlNode] input", {
                assetId: asset.id,
                variantOverride,
                hasToken: !!token,
            });

            if (asset.uploadData) {
                logger.debug("[ResolveAssetUrlNode] upload asset -> load from upload");
                return {
                    source: {
                        manifest: null,
                        url: null,
                        fromUpload: true,
                        variant: "original",
                        kind: detectAssetKind(asset),
                    },
                };
            }

            const manifest = await fetchAssetManifest(asset.id, token);

            const chosen = pickVariantFromManifest(manifest, {
                variantOverride,
                allowFallback: true,
            });

            const finalUrl = getResource(chosen.path);
            const kind = detectAssetKind(asset, { url: finalUrl });

            logger.debug("[ResolveAssetUrlNode] resolved", {
                assetId: asset.id,
                variant: chosen.variant,
                path: chosen.path,
                url: finalUrl,
                kind,
            });

            return {
                source: {
                    manifest,
                    url: finalUrl,
                    fromUpload: false,
                    variant: chosen.variant,
                    kind,
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

        async run(ctx, state, services) {
            const manifestSize = state?.source?.manifest?.metrics?.assetSizeBytes ?? null;
            const uploadSize = state?.input?.asset?.uploadData?.size ?? null;
            const assetSizeBytes = manifestSize ?? uploadSize ?? null;

            services.logger.debug("[AssetMetricNode]", {
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

            const kind = state?.source?.kind ?? "gltf";
            if (!state?.source?.kind) {
                services.logger.warn("[DecodeNode] missing kind, fallback to gltf");
            }
            services.logger.debug("[DecodeNode] source", {
                url,
                fromUpload,
                variant: state?.source?.variant ?? null,
                kind,
            });


            const object3D = await services.resourceLoader.load({
                asset,
                url,
                fromUpload,
                kind,
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

