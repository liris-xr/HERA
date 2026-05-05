export function selectAssetVariant(manifest, metrics, config = {}, currentVariant = null) {
    const variants = manifest?.variants || {};

    const has = (k) => variants[k] && variants[k].status === "ready" && variants[k].path;

    const {
        originalMin = 0.9,
        n1Min = 0.75,
        n2Min = 0.68,
        hysteresis = 0.05,
    } = config;

    const lodMetric = metrics?.visibleCoverage ?? 0;

    let current = currentVariant ?? "original";
    if (current === "simplified") current = "n1";

    let stay = false;

    if (current === "original") {
        stay = lodMetric >= (originalMin - hysteresis);
    } else if (current === "n1") {
        stay = lodMetric < (originalMin + hysteresis) && lodMetric >= (n1Min - hysteresis);
    } else if (current === "n2") {
        stay = lodMetric < (n1Min + hysteresis) && lodMetric >= (n2Min - hysteresis);
    } else if (current === "n3") {
        stay = lodMetric < (n2Min + hysteresis);
    }

    let target;
    if (stay) {
        target = current;
    } else {
        if (lodMetric >= originalMin) target = "original";
        else if (lodMetric >= n1Min) target = "n1";
        else if (lodMetric >= n2Min) target = "n2";
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


export function limitAutoUpgradeStep(currentVariant, targetVariant, metrics = {}, config = {}) {
    const order = ["n3", "n2", "n1", "original"];

    let current = currentVariant ?? targetVariant;
    let target = targetVariant;

    if (current === "simplified") current = "n1";
    if (target === "simplified") target = "n1";

    const currentIndex = order.indexOf(current);
    const targetIndex = order.indexOf(target);

    if (currentIndex === -1 || targetIndex === -1) {
        return targetVariant;
    }

    const coverage = metrics?.visibleCoverage ?? 0;

    const {
        originalMin = 0.22,
    } = config;

    // If the selector says the asset is close enough for full detail, do not step through n1/n2.
    if (target === "original" && coverage >= originalMin) {
        return "original";
    }

    //Sinon, en auto, on monte progressivement pour éviter les gros chargements inutiles.

    if (targetIndex > currentIndex + 1) {
        return order[currentIndex + 1];
    }

    return targetVariant;
}
