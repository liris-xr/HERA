//prend les métriques et variantes dispo puis choisis la meilleure
export function selectAssetVariant(manifest, metrics, config = {}) {
    const variants = manifest?.variants || {};

    const has = (k) => variants[k] && variants[k].status === "ready" && variants[k].path;

    const {
        near = 10,
        medium = 20,
        far = 30,
    } = config;

    const d = metrics?.cameraDistance ?? Infinity;

    let target = "original";
    if (d >= far) target = "n3";
    else if (d >= medium) target = "n2";
    else if (d >= near) target = "n1";
    else target = "original";

    // fallback intelligent
    if (has(target)) return target;
    if (target === "n3" && has("n2")) return "n2";
    if ((target === "n3" || target === "n2") && has("n1")) return "n1";
    if (has("original")) return "original";

    return target;
}
