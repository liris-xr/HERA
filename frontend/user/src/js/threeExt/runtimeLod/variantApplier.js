export async function ensureAssetVariant(asset, scene, variantId) {
    if (!asset || !scene || !variantId) return false;

    if (asset.currentVariant === variantId) {
        asset.pendingTargetVariant = null;
        return false;
    }

    if (asset.isVariantSwapPending) {
        asset.queuedTargetVariant = variantId;
        return false;
    }

    asset.isVariantSwapPending = true;
    asset.pendingTargetVariant = variantId;

    try {
        await asset.swapToVariant(scene, variantId);
        return asset.currentVariant === variantId;
    } catch (e) {
        console.error("[ensureAssetVariant] failed", {
            assetId: asset.id,
            requestedVariant: variantId,
            error: e,
        });
        return false;
    } finally {
        asset.isVariantSwapPending = false;
        asset.pendingTargetVariant = null;
    }
}