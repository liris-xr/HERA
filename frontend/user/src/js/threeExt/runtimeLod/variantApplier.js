//évite les swaps inutlies et demande le chargement si besoin
export async function ensureAssetVariant(asset, scene, variantId) {
    if (!asset || !scene || !variantId) return;

    if (asset.currentVariant === variantId) return;
    if (asset.isVariantSwapPending) return;

    asset.isVariantSwapPending = true;

    try {
        await asset.swapToVariant(scene, variantId);
    } finally {
        asset.isVariantSwapPending = false;
    }
}