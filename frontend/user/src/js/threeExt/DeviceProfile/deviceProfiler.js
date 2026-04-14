/*export const DEVICE_CLASSES = Object.freeze({
    LOW_MOBILE: "low-mobile",
    MID_MOBILE: "mid-mobile",
    HIGH_MOBILE: "high-mobile",
    LOW_DESKTOP: "low-desktop",
    MID_DESKTOP: "mid-desktop",
    HIGH_DESKTOP: "high-desktop",
});

export function collectSimpleDeviceInfo() {
    const touch = !!(
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0 ||
        "ontouchstart" in window
    );

    const width = window.innerWidth || window.screen?.width || 0;
    const dpr = window.devicePixelRatio || 1;

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

export function classifySimpleDevice(info) {
    const ram = info?.ramGbApprox ?? 0;
    const cores = info?.cpuLogicalCores ?? 0;
    const dpr = info?.dpr ?? 1;
    const type = info?.deviceType ?? "desktop";

    let score = 0;

    if (type === "desktop") score += 2;
    else if (type === "tablet") score += 1;

    if (ram >= 8) score += 2;
    else if (ram >= 4) score += 1;

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
                variantUpdateIntervalMs: 2500,
                lodConfig: {
                    originalMin: 0.28,
                    n1Min: 0.14,
                    n2Min: 0.06,
                    hysteresis: 0.03,
                },
            };

        case DEVICE_CLASSES.MID_MOBILE:
            return {
                deviceClass,
                variantUpdateIntervalMs: 1800,
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
                variantUpdateIntervalMs: 1200,
                lodConfig: {
                    originalMin: 0.22,
                    n1Min: 0.11,
                    n2Min: 0.045,
                    hysteresis: 0.015,
                },
            };

        case DEVICE_CLASSES.LOW_DESKTOP:
            return {
                deviceClass,
                variantUpdateIntervalMs: 1500,
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
                variantUpdateIntervalMs: 1000,
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
                variantUpdateIntervalMs: 700,
                lodConfig: {
                    originalMin: 0.18,
                    n1Min: 0.09,
                    n2Min: 0.035,
                    hysteresis: 0.01,
                },
            };
    }
}

export function buildSimpleDevicePolicy() {
    const info = collectSimpleDeviceInfo();
    const deviceClass = classifySimpleDevice(info);
    const policy = getLodPolicyForDeviceClass(deviceClass);

    return {
        info,
        ...policy,
    };
}


 */