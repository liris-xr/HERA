export function selectAssetVariant(manifest, metrics, config = {}, currentVariant = null) {
    const variants = manifest?.variants || {};

    const has = (k) => variants[k] && variants[k].status === "ready" && variants[k].path;

    const {
        originalMin = 0.20,
        n1Min = 0.10,
        n2Min = 0.04,
        hysteresis = 0.01,
    } = config;

    //calcul visible coverage
    const size = metrics?.visibleCoverage ?? 0;

    let current = currentVariant ?? "original";
    if (current === "simplified") current = "n1";

    let stay = false;

    if (current === "original") {
        stay = size >= (originalMin - hysteresis);
    } else if (current === "n1") {
        stay = size < (originalMin + hysteresis) && size >= (n1Min - hysteresis);
    } else if (current === "n2") {
        stay = size < (n1Min + hysteresis) && size >= (n2Min - hysteresis);
    } else if (current === "n3") {
        stay = size < (n2Min + hysteresis);
    }

    let target;
    if (stay) {
        target = current;
    } else {
        if (size >= originalMin) target = "original";
        else if (size >= n1Min) target = "n1";
        else if (size >= n2Min) target = "n2";
        else target = "n3";
    }

    if (has(target)) return target;

    const order = ["n3", "n2", "n1", "original"];
    const targetIdx = order.indexOf(target);

    if (targetIdx !== -1) {
        for (let i = targetIdx + 1; i < order.length; i++) {
            if (has(order[i])) return order[i];
        }
    }

    if (has("original")) return "original";

    return target;
}