export const DEVICE_CLASSES = Object.freeze({
    LOW_MOBILE: "low-mobile",
    MID_MOBILE: "mid-mobile",
    HIGH_MOBILE: "high-mobile",
    LOW_DESKTOP: "low-desktop",
    MID_DESKTOP: "mid-desktop",
    HIGH_DESKTOP: "high-desktop",
});

const VARIANT_CACHE_POLICIES = Object.freeze({
    LOW_MOBILE: Object.freeze({
        decodedLimit: 1,
        allowBytePrefetch: true,
        disposeOldVariant: true,
        maxStoredCacheWeight: 8,
        maxWarmCacheWeight: 3,
    }),
    MID_MOBILE: Object.freeze({
        decodedLimit: 2,
        allowBytePrefetch: true,
        disposeOldVariant: true,
        maxStoredCacheWeight: 16,
        maxWarmCacheWeight: 6,
    }),
    HIGH_MOBILE: Object.freeze({
        decodedLimit: 3,
        allowBytePrefetch: true,
        disposeOldVariant: true,
        maxStoredCacheWeight: 40,
        maxWarmCacheWeight: 12,
    }),
    LOW_DESKTOP: Object.freeze({
        decodedLimit: 3,
        allowBytePrefetch: true,
        disposeOldVariant: true,
        maxStoredCacheWeight: 32,
        maxWarmCacheWeight: 12,
    }),
    MID_DESKTOP: Object.freeze({
        decodedLimit: 3,
        allowBytePrefetch: true,
        disposeOldVariant: false,
        maxStoredCacheWeight: 64,
        maxWarmCacheWeight: 24,
    }),
    //machine puissante, on peut garder 2 variantes prêtes en mémoire
    HIGH_DESKTOP: Object.freeze({
        decodedLimit: 3,
        allowBytePrefetch: true,
        disposeOldVariant: false,
        maxStoredCacheWeight: Infinity,
        maxWarmCacheWeight: Infinity,
    }),
});

function getVariantCachePolicyForDeviceClass(deviceClass) {
    switch (deviceClass) {
        case DEVICE_CLASSES.LOW_MOBILE:
            return VARIANT_CACHE_POLICIES.LOW_MOBILE;

        case DEVICE_CLASSES.MID_MOBILE:
            return VARIANT_CACHE_POLICIES.MID_MOBILE;

        case DEVICE_CLASSES.HIGH_MOBILE:
            return VARIANT_CACHE_POLICIES.HIGH_MOBILE;

        case DEVICE_CLASSES.LOW_DESKTOP:
            return VARIANT_CACHE_POLICIES.LOW_DESKTOP;

        case DEVICE_CLASSES.MID_DESKTOP:
            return VARIANT_CACHE_POLICIES.MID_DESKTOP;

        case DEVICE_CLASSES.HIGH_DESKTOP:
        default:
            return VARIANT_CACHE_POLICIES.HIGH_DESKTOP;
    }
}

export function collectSimpleDeviceInfo() {
    //essayer de savoir si le device est tactile
    const touch = !!(
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0 ||
        "ontouchstart" in window
    );
    const width = window.innerWidth || window.screen?.width || 0;
    //ratio of the picture width to the viewport/ mesure combien de pixels physiques sont rendus pour 1 pixel CSS
    const dpr = window.devicePixelRatio || 1;

    //device is mobile mostly if its UA string says so or if its touch capable with a narrow viewport (small tablet/phone)
    const isMobileLike =
        /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent) ||
        (touch && width < 900);

    const isTabletLike =
        /iPad|Tablet/i.test(navigator.userAgent) ||
        (touch && width >= 900 && width < 1200);

    let deviceType = "desktop";
    if (isTabletLike) deviceType = "tablet";
    else if (isMobileLike) deviceType = "mobile";

    return {
        deviceType,
        ramGbApprox: Number.isFinite(Number(navigator.deviceMemory))
            ? Number(navigator.deviceMemory)
            : null,
        cpuLogicalCores: Number.isFinite(Number(navigator.hardwareConcurrency))
            ? Number(navigator.hardwareConcurrency)
            : null,
        dpr,
        touch,
        width,
        height: window.innerHeight || window.screen?.height || 0,
    };
}


// converts a raw device info object into one of the six device_classes
export function classifySimpleDevice(info) {
    //safe defaults if info is missing
    const ram = info?.ramGbApprox ?? 0;
    const cores = info?.cpuLogicalCores ?? 0;
    const dpr = info?.dpr ?? 1;
    const type = info?.deviceType ?? "desktop";

    let score = 0;

    //form factor base score
    if (type === "desktop") score += 2;
    else if (type === "tablet") score += 1;

    //RAM contribution
    if (ram >= 8) score += 2;
    else if (ram >= 4) score += 1;

    //CPU contribution
    if (cores >= 8) score += 2;
    else if (cores >= 4) score += 1;

    if (type !== "desktop" && dpr >= 3) {
        score -= 1;
    }

    if (type === "mobile" || type === "tablet") {
        if (score <= 1) return DEVICE_CLASSES.LOW_MOBILE;
        if (score <= 3) return DEVICE_CLASSES.MID_MOBILE;
        return DEVICE_CLASSES.HIGH_MOBILE;
    }

    if (score <= 2) return DEVICE_CLASSES.LOW_DESKTOP;
    if (score <= 4) return DEVICE_CLASSES.MID_DESKTOP;
    return DEVICE_CLASSES.HIGH_DESKTOP;
}

export function getLodPolicyForDeviceClass(deviceClass) {
    switch (deviceClass) {
        case DEVICE_CLASSES.LOW_MOBILE:
            return {
                deviceClass,
                variantUpdateIntervalMs: 200, //evaluate only every 2.5s
                variantCache: getVariantCachePolicyForDeviceClass(deviceClass),
                lodConfig: {
                    originalMin: 0.28, //needs > 28% screen coverage for full mesh
                    n1Min: 0.14,
                    n2Min: 0.06,
                    hysteresis: 0.03, //wider dead band = more stable on slow devices
                },
            };

        case DEVICE_CLASSES.MID_MOBILE:
            return {
                deviceClass,
                variantUpdateIntervalMs: 100,
                variantCache: getVariantCachePolicyForDeviceClass(deviceClass),
                lodConfig: {
                    originalMin: 0.24,
                    n1Min: 0.12,
                    n2Min: 0.05,
                    hysteresis: 0.02,
                },
            };

        case DEVICE_CLASSES.HIGH_MOBILE:
            return {
                deviceClass,
                variantUpdateIntervalMs: 200,
                variantCache: getVariantCachePolicyForDeviceClass(deviceClass),
                lodConfig: {
                    originalMin: 0.22,
                    n1Min: 0.11,
                    n2Min: 0.045,
                    hysteresis: 0.015,
                },
            };

        case DEVICE_CLASSES.LOW_DESKTOP:
            //interval similar to high mobile
            return {
                deviceClass,
                variantUpdateIntervalMs: 100,
                variantCache: getVariantCachePolicyForDeviceClass(deviceClass),
                lodConfig: {
                    originalMin: 0.22,
                    n1Min: 0.11,
                    n2Min: 0.045,
                    hysteresis: 0.02,
                },
            };

        case DEVICE_CLASSES.MID_DESKTOP:
            return {
                deviceClass,
                variantUpdateIntervalMs: 100,
                variantCache: getVariantCachePolicyForDeviceClass(deviceClass),
                lodConfig: {
                    originalMin: 0.20,
                    n1Min: 0.10,
                    n2Min: 0.04,
                    hysteresis: 0.015,
                },
            };

        case DEVICE_CLASSES.HIGH_DESKTOP:
        default:
            return {
                deviceClass,
                variantUpdateIntervalMs: 100,
                variantCache: getVariantCachePolicyForDeviceClass(deviceClass),
                lodConfig: {
                    originalMin: 0.18,
                    n1Min: 0.09,
                    n2Min: 0.035,
                    hysteresis: 0.01,
                },
            };
    }
}

export function getShadowMapSizeForDeviceClass(deviceClass) {
    switch (deviceClass) {
        case DEVICE_CLASSES.LOW_MOBILE:
            return 1024;

        case DEVICE_CLASSES.MID_MOBILE:
        case DEVICE_CLASSES.HIGH_MOBILE:
        case DEVICE_CLASSES.LOW_DESKTOP:
        case DEVICE_CLASSES.MID_DESKTOP:
            return 2048;

        case DEVICE_CLASSES.HIGH_DESKTOP:
        default:
            return 4096;
    }
}

export function buildSimpleDevicePolicy() {
    const info = collectSimpleDeviceInfo();
    const deviceClass = classifySimpleDevice(info);
    const policy = getLodPolicyForDeviceClass(deviceClass);

    return {
        info,
        shadowMapSize: getShadowMapSizeForDeviceClass(deviceClass),
        ...policy,
    };
}
