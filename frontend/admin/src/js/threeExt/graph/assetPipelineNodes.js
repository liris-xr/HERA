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

            if (asset.uploadData) {
                console.log("[ResolveAssetUrlNode] upload asset -> load from upload");
                return {
                    urlToLoad: null,
                    loadFromUpload: true,
                    variant: "original",
                };
            }

            const manifest = await fetchAssetManifest(asset.id);
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
                urlToLoad: finalUrl,
                loadFromUpload: false,
                variant: chosen.variant,
                manifest,
            };
        },
    };
}

export function DecodeNode() {
    return {
        id: "Decode",
        async run(ctx, data) {
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