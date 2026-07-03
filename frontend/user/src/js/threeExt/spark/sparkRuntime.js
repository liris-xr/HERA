import { buildSplatDebugPayload, logSplatDebug } from "@shared/splat/splatDiagnostics.js";

const SPARK_RENDERER_KEY = "heraSparkRenderer";
const SPARK_RENDERER_PENDING_KEY = "heraSparkRendererPending";
const SPARK_XR_PROFILE_KEY = "heraSparkXrProfile";

const SPARK_PROFILE_PROPS = Object.freeze([
    "maxStdDev",
    "lodSplatCount",
    "lodRenderScale",
    "maxPixelRadius",
    "sortRadial",
]);

const SPARK_XR_PROFILE = Object.freeze({
    maxStdDev: Math.sqrt(5),
    lodSplatCount: 80000,
    lodRenderScale: 3.0,
    maxPixelRadius: 128,
    sortRadial: true,
});

let sparkUrlOptionsCache = null;

function getDebugUrlParams() {
    if (typeof window === "undefined") return [];

    const params = [];
    try {
        params.push(new URLSearchParams(window.location.search));

        const hash = String(window.location.hash ?? "");
        const hashQueryStart = hash.indexOf("?");
        if (hashQueryStart !== -1) {
            params.push(new URLSearchParams(hash.slice(hashQueryStart + 1)));
        }
    } catch {
        return params;
    }

    return params;
}

function getPositiveUrlNumber(paramsList, name, { integer = false } = {}) {
    for (const params of paramsList) {
        const raw = params.get(name);
        if (raw == null || raw.trim() === "") continue;

        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) continue;

        const normalized = integer ? Math.floor(value) : value;
        if (normalized <= 0) continue;

        return normalized;
    }

    return null;
}

function getSparkUrlOptions() {
    if (sparkUrlOptionsCache) return sparkUrlOptionsCache;

    const paramsList = getDebugUrlParams();
    sparkUrlOptionsCache = {
        debug: paramsList.some((params) =>
            params.get("perfDebug") === "1" || params.get("arMetrics") === "1"
        ),
        lodSplatCount: getPositiveUrlNumber(paramsList, "sparkArBudget", { integer: true }),
        lodRenderScale: getPositiveUrlNumber(paramsList, "sparkArScale"),
    };

    return sparkUrlOptionsCache;
}

function hasSparkProfileDebugFlag() {
    return getSparkUrlOptions().debug;
}

function isQuestOrOculusBrowser() {
    if (typeof navigator === "undefined") return false;
    return /Quest|OculusBrowser/i.test(String(navigator.userAgent ?? ""));
}

function getSparkProfileState(sparkRenderer) {
    if (!sparkRenderer) return null;
    if (!sparkRenderer.userData) sparkRenderer.userData = {};

    if (!sparkRenderer.userData[SPARK_XR_PROFILE_KEY]) {
        const defaults = {};

        for (const prop of SPARK_PROFILE_PROPS) {
            if (prop in sparkRenderer) {
                defaults[prop] = sparkRenderer[prop];
            }
        }

        sparkRenderer.userData[SPARK_XR_PROFILE_KEY] = {
            defaults,
            appliedProfile: null,
            lastLogSignature: null,
        };
    }

    return sparkRenderer.userData[SPARK_XR_PROFILE_KEY];
}

function buildSparkXrProfile() {
    const { lodSplatCount, lodRenderScale } = getSparkUrlOptions();

    return {
        ...SPARK_XR_PROFILE,
        ...(lodSplatCount != null ? { lodSplatCount } : {}),
        ...(lodRenderScale != null ? { lodRenderScale } : {}),
    };
}

function assignSupportedSparkProps(sparkRenderer, values) {
    let changed = false;

    for (const prop of SPARK_PROFILE_PROPS) {
        if (!(prop in sparkRenderer) || !(prop in values)) continue;
        if (sparkRenderer[prop] === values[prop]) continue;

        sparkRenderer[prop] = values[prop];
        changed = true;
    }

    if (changed && "lodDirty" in sparkRenderer) {
        sparkRenderer.lodDirty = true;
    }

    return changed;
}

function snapshotSparkProfile(sparkRenderer) {
    const snapshot = {};

    for (const prop of SPARK_PROFILE_PROPS) {
        snapshot[prop] = prop in sparkRenderer ? sparkRenderer[prop] : null;
    }

    return snapshot;
}

function logSparkXrProfile({ sparkRenderer, isXR, isQuest, appliedProfile }) {
    if (!hasSparkProfileDebugFlag()) return;

    const state = getSparkProfileState(sparkRenderer);
    const values = snapshotSparkProfile(sparkRenderer);
    const payload = {
        isXR,
        isQuest,
        appliedProfile,
        lodSplatCount: values.lodSplatCount,
        lodRenderScale: values.lodRenderScale,
        maxStdDev: values.maxStdDev,
        maxPixelRadius: values.maxPixelRadius,
        sortRadial: values.sortRadial,
    };
    const signature = JSON.stringify(payload);

    if (state.lastLogSignature === signature) return;
    state.lastLogSignature = signature;

    console.info("[HERA][SparkXRProfile]", payload);
}

export function getSparkRendererForScene(scene) {
    const sparkRenderer = scene?.userData?.[SPARK_RENDERER_KEY];
    if (sparkRenderer && typeof sparkRenderer === "object") return sparkRenderer;

    const child = scene?.children?.find?.((object) =>
        object?.userData?.[SPARK_RENDERER_KEY] === true
    );
    return child && typeof child === "object" ? child : null;
}

export function applySparkXrPerformanceProfile(sparkRenderer, renderer) {
    if (!sparkRenderer || !renderer) return null;

    const state = getSparkProfileState(sparkRenderer);
    if (!state) return null;

    const isXR = renderer.xr?.isPresenting === true;
    const isQuest = isQuestOrOculusBrowser();
    const shouldApply = isXR || isQuest;
    const appliedProfile = shouldApply ? "quest-xr" : "default";

    if (shouldApply) {
        assignSupportedSparkProps(sparkRenderer, buildSparkXrProfile());
        state.appliedProfile = appliedProfile;
    } else if (state.appliedProfile) {
        assignSupportedSparkProps(sparkRenderer, state.defaults);
        state.appliedProfile = null;
    }

    logSparkXrProfile({
        sparkRenderer,
        isXR,
        isQuest,
        appliedProfile,
    });

    return {
        isXR,
        isQuest,
        appliedProfile,
        ...snapshotSparkProfile(sparkRenderer),
    };
}

export function sceneHasSparkContent(scene) {
    let hasSparkContent = false;

    scene?.traverse?.((object) => {
        if (object?.userData?.heraAssetKind === "splat") {
            hasSparkContent = true;
        }
    });

    return hasSparkContent;
}

export async function ensureSparkRenderer({ renderer, scene, force = false }) {
    // One SparkRenderer per scene, attached to HERA's existing Three renderer and render loop.
    if (!renderer || !scene) return null;

    const existingSparkRenderer = getSparkRendererForScene(scene);
    if (existingSparkRenderer) {
        scene.userData[SPARK_RENDERER_KEY] = existingSparkRenderer;
        applySparkXrPerformanceProfile(existingSparkRenderer, renderer);
        return existingSparkRenderer;
    }

    if (scene.userData?.[SPARK_RENDERER_PENDING_KEY]) {
        const pendingSparkRenderer = await scene.userData[SPARK_RENDERER_PENDING_KEY];
        applySparkXrPerformanceProfile(pendingSparkRenderer, renderer);
        return pendingSparkRenderer;
    }

    if (!force && !sceneHasSparkContent(scene)) return null;

    scene.userData[SPARK_RENDERER_PENDING_KEY] = createSparkRenderer({ renderer, scene });

    try {
        const sparkRenderer = await scene.userData[SPARK_RENDERER_PENDING_KEY];
        applySparkXrPerformanceProfile(sparkRenderer, renderer);
        return sparkRenderer;
    } finally {
        delete scene.userData[SPARK_RENDERER_PENDING_KEY];
    }
}

async function createSparkRenderer({ renderer, scene }) {
    const sparkModule = await import("@sparkjsdev/spark");
    const { SparkRenderer } = sparkModule;
    const options = {
        renderer,
        maxStdDev: Math.sqrt(6),
        maxPixelRadius: 160,
        minSortIntervalMs: 50,
    };

    const sparkRenderer = new SparkRenderer(options);

    sparkRenderer.name = "HERA Spark Renderer";
    sparkRenderer.userData.heraSparkRenderer = true;

    scene.add(sparkRenderer);
    scene.userData[SPARK_RENDERER_KEY] = sparkRenderer;

    logSplatDebug("viewer-spark-renderer-created", buildSplatDebugPayload({
        renderer,
        sparkModule,
        options: {
            maxStdDev: options.maxStdDev,
            maxPixelRadius: options.maxPixelRadius,
            minSortIntervalMs: options.minSortIntervalMs,
        },
        source: {
            sceneName: scene.name ?? null,
            sceneType: scene.type ?? null,
            noSecondRenderer: true,
            noSecondRenderLoop: true,
        },
    }));

    return sparkRenderer;
}
