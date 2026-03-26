//évite les swaps inutlies et demande le chargement si besoin
export async function ensureAssetVariant(asset, scene, variantId) {
    if (!asset || !scene || !variantId) return false;

    if (asset.currentVariant === variantId) return false;
    if (asset.isVariantSwapPending) return false;

    asset.isVariantSwapPending = true;

    try {
        await asset.swapToVariant(scene, variantId);
        return true;
    } finally {
        asset.isVariantSwapPending = false;
    }


}