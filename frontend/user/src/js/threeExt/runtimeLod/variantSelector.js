export function selectAssetVariant(manifest, metrics, config = {}, currentVariant = null) {
    const variants = manifest?.variants || {};

    const has = (k) => variants[k] && variants[k].status === "ready" && variants[k].path;

    // seuils sur distance normalisée = distance / radius
    const {
        near = 2.0,
        medium = 4.0,
        far = 8.0,
        hysteresis = 0.5,
    } = config;

    const nd = metrics?.normalizedDistance ?? Infinity;

    let target = currentVariant ?? "original";

    if (target === "simplified") target = "n1";

    if (target === "original") {
        if (nd >= near + hysteresis) target = "n1";
    } else if (target === "n1") {
        if (nd < near - hysteresis) target = "original";
        else if (nd >= medium + hysteresis) target = "n2";
    } else if (target === "n2") {
        if (nd < medium - hysteresis) target = "n1";
        else if (nd >= far + hysteresis) target = "n3";
    } else if (target === "n3") {
        if (nd < far - hysteresis) target = "n2";
    } else {
        target = "original";
    }

    if (has(target)) return target;
    if (target === "n3" && has("n2")) return "n2";
    if ((target === "n3" || target === "n2") && has("n1")) return "n1";
    if (has("original")) return "original";

    return target;
}