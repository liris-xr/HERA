export function pickVariantFromManifest(manifest, options = {}) {
    const variantOverride = options.variantOverride ?? null;
    const allowFallback = options.allowFallback ?? true;

    const variants = manifest?.variants || {};
    const preferred = variantOverride || manifest?.preferredVariant || "original";

    function isReady(v) {
        return v && v.status === "ready" && v.path;
    }

    function abs(p) {
        return p?.startsWith("/") ? p : `/${p}`;
    }

    let chosenKey = preferred;
    let chosen = variants[chosenKey];

    if (!isReady(chosen) && allowFallback) {
        const fallbackOrder = ["original", "n1", "n2", "n3", "simplified"];
        chosenKey = fallbackOrder.find((k) => isReady(variants[k]));
        chosen = chosenKey ? variants[chosenKey] : null;
    }

    if (!isReady(chosen)) {
        throw new Error(`No ready variant for asset ${manifest?.assetId}`);
    }

    return {
        variant: chosenKey,
        path: abs(chosen.path),
    };
}
