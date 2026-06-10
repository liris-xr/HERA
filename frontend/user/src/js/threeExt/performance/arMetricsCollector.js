import { shallowRef } from "vue";
import { collectAssetMetrics } from "@/js/threeExt/performance/assetMetrics.js";

const DEFAULTS = Object.freeze({
    sampleIntervalMs: 1000,
    assetIntervalMs: 3000,
    memoryIntervalMs: 10000,
    webglErrorIntervalMs: 10000,
    consoleLogIntervalMs: 2000,
    autoSaveIntervalMs: 5000,
    maxHistorySamples: 3000,
});

const STORAGE_KEY = "HERA_AR_METRICS_SESSION";
const LAST_SESSION_KEY = "HERA_AR_METRICS_LAST_SESSION";
const IS_DEV = Boolean(import.meta.env?.DEV);

function getSearchParams() {
    if (typeof window === "undefined") return new URLSearchParams();

    try {
        return new URLSearchParams(window.location.search);
    } catch {
        return new URLSearchParams();
    }
}

function getLocalStorageFlag(key) {
    if (typeof window === "undefined") return false;

    try {
        return window.localStorage?.getItem(key) === "1";
    } catch {
        return false;
    }
}

function getNumericQueryParam(name, fallback, { min = 100, max = 60000 } = {}) {
    const value = Number(getSearchParams().get(name));
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
}

function hasMetricsFlag() {
    const params = getSearchParams();
    return params.get("arMetrics") === "1" || getLocalStorageFlag("heraArMetrics");
}

function hasMetricsDisabledFlag() {
    return getSearchParams().get("arMetrics") === "0";
}

function hasDesktopCollectionFlag() {
    const params = getSearchParams();
    return (
        params.get("arMetricsDesktop") === "1" ||
        getLocalStorageFlag("heraArMetricsDesktop")
    );
}

function hasWebGlErrorPollingFlag() {
    const params = getSearchParams();
    return (
        params.get("arMetricsWebglErrors") === "1" ||
        getLocalStorageFlag("heraArMetricsWebglErrors")
    );
}

function hasDetailedAssetMetricsFlag() {
    const params = getSearchParams();
    return (
        params.get("arMetricsAssets") === "1" ||
        getLocalStorageFlag("heraArMetricsAssets")
    );
}

function hasOverlayFlag() {
    return getSearchParams().get("arMetricsOverlay") === "1";
}

function hasMetricsHudFlag() {
    return getSearchParams().get("arMetricsHud") === "1";
}

function hasConsoleLoggingFlag() {
    return getSearchParams().get("arMetricsConsole") === "1";
}

function hasAutoSaveFlag() {
    return getSearchParams().get("arMetricsAutoSave") === "1";
}

function hasDownloadOnEndFlag() {
    return getSearchParams().get("arMetricsDownloadOnEnd") === "1";
}

function round(value, digits = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;

    const factor = 10 ** digits;
    return Math.round(n * factor) / factor;
}

function bytesToMb(bytes) {
    const n = Number(bytes);
    return Number.isFinite(n) ? round(n / (1024 * 1024), 2) : null;
}

function nowMs() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function percentile(values, ratio) {
    if (!values.length) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil(sorted.length * ratio) - 1)
    );

    return sorted[index];
}

function getFrameStats(frameTimes) {
    if (!frameTimes.length) {
        return {
            avgFrameMs: null,
            avgFps: null,
            worstFrameMs: null,
            p95FrameMs: null,
            sampleCount: 0,
        };
    }

    const total = frameTimes.reduce((sum, value) => sum + value, 0);
    const avgFrameMs = total / frameTimes.length;

    return {
        avgFrameMs: round(avgFrameMs, 2),
        avgFps: avgFrameMs > 0 ? round(1000 / avgFrameMs, 1) : null,
        worstFrameMs: round(Math.max(...frameTimes), 2),
        p95FrameMs: round(percentile(frameTimes, 0.95), 2),
        sampleCount: frameTimes.length,
    };
}

function getMemorySnapshot() {
    const memory = typeof performance !== "undefined" ? performance.memory : null;
    if (!memory) {
        return {
            supported: false,
            usedJSHeapMb: null,
            totalJSHeapMb: null,
            jsHeapLimitMb: null,
        };
    }

    return {
        supported: true,
        usedJSHeapMb: bytesToMb(memory.usedJSHeapSize),
        totalJSHeapMb: bytesToMb(memory.totalJSHeapSize),
        jsHeapLimitMb: bytesToMb(memory.jsHeapSizeLimit),
    };
}

function getDrawingBufferSnapshot(renderer) {
    const target = {
        x: 0,
        y: 0,
        set(x, y) {
            this.x = x;
            this.y = y;
            return this;
        },
        floor() {
            this.x = Math.floor(this.x);
            this.y = Math.floor(this.y);
            return this;
        },
    };

    try {
        renderer.getDrawingBufferSize(target);
    } catch {
        return {
            width: null,
            height: null,
            megapixels: null,
        };
    }

    return {
        width: target.x,
        height: target.y,
        megapixels: round((target.x * target.y) / 1_000_000, 2),
    };
}

function getWebGlErrorName(gl, code) {
    if (!gl || code == null) return null;

    const names = [
        "NO_ERROR",
        "INVALID_ENUM",
        "INVALID_VALUE",
        "INVALID_OPERATION",
        "OUT_OF_MEMORY",
        "INVALID_FRAMEBUFFER_OPERATION",
        "CONTEXT_LOST_WEBGL",
    ];

    for (const name of names) {
        if (gl[name] === code) return name;
    }

    return `0x${Number(code).toString(16)}`;
}

function pollWebGlErrors(renderer) {
    let gl = null;

    try {
        gl = renderer.getContext();
    } catch {
        return [];
    }

    if (!gl?.getError) return [];

    const errors = [];
    for (let i = 0; i < 8; i++) {
        const code = gl.getError();
        if (code === gl.NO_ERROR) break;
        errors.push(getWebGlErrorName(gl, code));
    }

    return errors;
}

function getRendererSnapshot(renderer) {
    const info = renderer?.info ?? {};
    const render = info.render ?? {};
    const memory = info.memory ?? {};

    return {
        frame: render.frame ?? null,
        calls: render.calls ?? null,
        triangles: render.triangles ?? null,
        points: render.points ?? null,
        lines: render.lines ?? null,
        geometries: memory.geometries ?? null,
        textures: memory.textures ?? null,
        pixelRatio: renderer?.getPixelRatio?.() ?? null,
        drawingBuffer: getDrawingBufferSnapshot(renderer),
    };
}

function collectAssets(scene, camera, options = {}) {
    const assets = typeof scene?.getAssets === "function" ? scene.getAssets() : [];
    return Array.from(assets ?? [])
        .map((asset) => collectAssetMetrics(asset, camera, options))
        .filter(Boolean);
}

function downloadText(filename, text, mimeType) {
    if (typeof document === "undefined") return false;

    try {
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    } catch (error) {
        console.warn("[HERA][ARMetrics] download blocked or failed", error);
        return false;
    }
}

function csvCell(value) {
    if (value == null) return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${text.replaceAll("\"", "\"\"")}"`;
}

function makeExportName(extension) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `hera-ar-metrics-${stamp}.${extension}`;
}

function saveSessionToStorage(payload, key = LAST_SESSION_KEY) {
    if (typeof window === "undefined") return false;

    try {
        window.localStorage?.setItem(key, JSON.stringify(payload));
        return true;
    } catch (error) {
        console.warn("[HERA][ARMetrics] could not save session", error);
        return false;
    }
}

function clearStoredSession() {
    if (typeof window === "undefined") return;

    try {
        window.localStorage?.removeItem(STORAGE_KEY);
        window.localStorage?.removeItem(LAST_SESSION_KEY);
    } catch {
        // ignore storage cleanup failure
    }
}

function toCsvRows(history) {
    const headers = [
        "timestamp",
        "elapsedMs",
        "mode",
        "isXRPresenting",
        "fps",
        "frameMs",
        "p95FrameMs",
        "worstFrameMs",
        "drawCalls",
        "rendererTriangles",
        "rendererPoints",
        "rendererGeometries",
        "rendererTextures",
        "devicePixelRatio",
        "canvasWidth",
        "canvasHeight",
        "usedJSHeapMb",
        "webglErrors",
        "url",
        "userAgent",
        "assetId",
        "assetName",
        "assetKind",
        "assetObjectType",
        "assetVariant",
        "assetVisible",
        "assetDistance",
        "assetTriangles",
        "assetVertices",
        "assetGeometryPositionCount",
        "assetStaticPointVertices",
        "assetVisiblePoints",
        "assetVisibleNodes",
        "assetLoadedPoints",
        "assetLoadedNodes",
        "assetTotalPoints",
        "assetPointBudget",
        "assetPointCountEstimated",
        "assetInferredSplatCount",
        "assetSplatTotal",
        "assetSplatActive",
        "assetSplatLod",
        "assetEstimatedGeometryBytes",
        "assetEstimatedGeometryMb",
    ];

    const rows = [headers.map(csvCell).join(",")];

    for (const sample of history) {
        const assets = sample.assets?.length ? sample.assets : [null];
        for (const asset of assets) {
            rows.push([
                sample.timestamp,
                sample.elapsedMs,
                sample.mode,
                sample.isXRPresenting,
                sample.fps,
                sample.frameMs,
                sample.p95FrameMs,
                sample.worstFrameMs,
                sample.renderer?.calls,
                sample.renderer?.triangles,
                sample.renderer?.points,
                sample.renderer?.geometries,
                sample.renderer?.textures,
                sample.devicePixelRatio,
                sample.canvas?.width,
                sample.canvas?.height,
                sample.memory?.usedJSHeapMb,
                sample.webglErrors?.join("|"),
                sample.url,
                sample.userAgent,
                asset?.id,
                asset?.name,
                asset?.kind,
                asset?.objectType,
                asset?.currentVariant,
                asset?.visible,
                asset?.cameraDistance,
                asset?.triangles,
                asset?.vertices,
                asset?.geometryPositionCount,
                asset?.staticPointVertices,
                asset?.pointCloud?.visiblePoints,
                asset?.pointCloud?.visibleNodes,
                asset?.pointCloud?.loadedPoints,
                asset?.pointCloud?.loadedNodes,
                asset?.pointCloud?.totalPoints,
                asset?.pointCloud?.pointBudget,
                asset?.pointCloud?.estimated,
                asset?.inferredSplatCount,
                asset?.splat?.totalSplats,
                asset?.splat?.activeSplats,
                asset?.splat?.lodSplats,
                asset?.estimatedGeometryBytes,
                asset?.estimatedGeometryMb,
            ].map(csvCell).join(","));
        }
    }

    return rows.join("\n");
}

function summarizeAssetForLog(asset) {
    if (!asset) return null;

    return {
        id: asset.id,
        name: asset.name,
        kind: asset.kind,
        distance: asset.cameraDistance,
        visiblePoints: asset.pointCloud?.visiblePoints ?? null,
        splats: asset.splat?.activeSplats ?? asset.splat?.lodSplats ?? asset.splat?.totalSplats ?? null,
        triangles: asset.triangles,
        geometryMb: asset.estimatedGeometryMb,
    };
}

function getBrowserContext() {
    return {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        url: typeof window !== "undefined" ? window.location.href : null,
    };
}

function createSample({
    renderer,
    frameTimes,
    sessionStartedAt,
    scene,
    assetScene,
    mode,
    frame,
    memory,
    webglErrors,
    assets,
}) {
    const wallNow = nowMs();
    const fpsStats = getFrameStats(frameTimes);
    const rendererSnapshot = getRendererSnapshot(renderer);
    const browser = getBrowserContext();

    return {
        enabled: true,
        timestamp: new Date().toISOString(),
        elapsedMs: Math.round(wallNow - sessionStartedAt),
        elapsedSec: round((wallNow - sessionStartedAt) / 1000, 2),
        mode,
        isXRPresenting: !!renderer?.xr?.isPresenting,
        xrPresenting: !!renderer?.xr?.isPresenting,
        hasXrFrame: !!frame,
        sceneId: assetScene?.sceneId ?? scene?.sceneId ?? null,
        sceneTitle: assetScene?.title ?? scene?.title ?? null,
        fps: fpsStats.avgFps,
        frameMs: fpsStats.avgFrameMs,
        p95FrameMs: fpsStats.p95FrameMs,
        worstFrameMs: fpsStats.worstFrameMs,
        fpsStats,
        renderer: rendererSnapshot,
        devicePixelRatio: rendererSnapshot.pixelRatio,
        canvas: {
            width: rendererSnapshot.drawingBuffer.width,
            height: rendererSnapshot.drawingBuffer.height,
            megapixels: rendererSnapshot.drawingBuffer.megapixels,
        },
        memory,
        webglErrors,
        assets,
        userAgent: browser.userAgent,
        url: browser.url,
    };
}

export function createArMetricsCollector({
    renderer,
    getScene,
    getAssetScene,
    getCamera,
    getMode,
    enabled = !hasMetricsDisabledFlag() && (IS_DEV || hasMetricsFlag()),
    collectInline = hasMetricsFlag() || hasDesktopCollectionFlag(),
    sampleIntervalMs = getNumericQueryParam("arMetricsInterval", DEFAULTS.sampleIntervalMs),
    assetIntervalMs = DEFAULTS.assetIntervalMs,
    memoryIntervalMs = DEFAULTS.memoryIntervalMs,
    webglErrorIntervalMs = DEFAULTS.webglErrorIntervalMs,
    pollWebGlErrorsEnabled = hasWebGlErrorPollingFlag(),
    includeDetailedAssetMetrics = hasDetailedAssetMetricsFlag(),
    overlayEnabled = enabled && hasOverlayFlag(),
    hudEnabled = enabled && hasMetricsHudFlag(),
    consoleLoggingEnabled = enabled && hasConsoleLoggingFlag(),
    autoSaveEnabled = enabled && (IS_DEV || hasAutoSaveFlag()),
    downloadOnEndEnabled = enabled && hasDownloadOnEndFlag(),
    consoleLogIntervalMs = DEFAULTS.consoleLogIntervalMs,
    autoSaveIntervalMs = DEFAULTS.autoSaveIntervalMs,
    maxHistorySamples = DEFAULTS.maxHistorySamples,
} = {}) {
    const live = shallowRef(null);
    const sessionEndCount = shallowRef(0);
    const sessionActive = shallowRef(false);
    const history = [];
    const frameTimes = [];

    let sessionStartedAt = nowMs();
    let sessionStartedAtIso = new Date().toISOString();
    let lastFrameTime = null;
    let lastSampleAt = 0;
    let lastMemoryAt = 0;
    let lastWebGlErrorAt = 0;
    let lastAssetAt = -Infinity;
    let lastConsoleLogAt = 0;
    let lastAutoSaveAt = 0;
    let memorySnapshot = getMemorySnapshot();
    let webglErrors = [];
    let assetsSnapshot = [];

    function reset() {
        live.value = null;
        history.length = 0;
        frameTimes.length = 0;
        sessionStartedAt = nowMs();
        sessionStartedAtIso = new Date().toISOString();
        lastFrameTime = null;
        lastSampleAt = 0;
        lastMemoryAt = 0;
        lastWebGlErrorAt = 0;
        lastAssetAt = -Infinity;
        lastConsoleLogAt = 0;
        lastAutoSaveAt = 0;
        memorySnapshot = getMemorySnapshot();
        webglErrors = [];
        assetsSnapshot = [];
    }

    function getExportPayload() {
        return {
            exportedAt: new Date().toISOString(),
            sessionStartedAt: sessionStartedAtIso,
            sampleIntervalMs,
            assetIntervalMs,
            consoleLogIntervalMs,
            autoSaveIntervalMs,
            maxHistorySamples,
            memorySupported: memorySnapshot.supported,
            includeDetailedAssetMetrics,
            browser: getBrowserContext(),
            latest: live.value,
            samples: history,
        };
    }

    function exportJSON() {
        if (!enabled) return "";
        return JSON.stringify(getExportPayload(), null, 2);
    }

    function exportCSV() {
        if (!enabled) return "";
        return toCsvRows(history);
    }

    function downloadJSON() {
        if (!enabled) return false;
        return downloadText(makeExportName("json"), exportJSON(), "application/json");
    }

    function downloadCSV() {
        if (!enabled) return false;
        return downloadText(makeExportName("csv"), exportCSV(), "text/csv");
    }

    function maybeAutoSave(wallNow) {
        if (!autoSaveEnabled || wallNow - lastAutoSaveAt < autoSaveIntervalMs) return;
        lastAutoSaveAt = wallNow;
        saveSessionToStorage(getExportPayload(), STORAGE_KEY);
    }

    function startSession() {
        if (!enabled) return;
        reset();
        sessionActive.value = true;
        console.info("[HERA][ARMetrics] WebXR session started");
    }

    function endSession() {
        if (!enabled) return;
        sampleAfterRender(nowMs(), null, {
            mode: getMode?.() ?? null,
            reason: "session-end",
            force: true,
        });

        sessionActive.value = false;
        sessionEndCount.value += 1;

        const payload = getExportPayload();
        saveSessionToStorage(payload, LAST_SESSION_KEY);

        if (downloadOnEndEnabled) {
            const downloaded = downloadJSON();
            if (!downloaded) {
                console.warn("[HERA][ARMetrics] download blocked; metrics kept in localStorage", {
                    key: LAST_SESSION_KEY,
                });
            }
        }

        console.info("[HERA][ARMetrics] WebXR session ended", {
            samples: history.length,
            savedToLocalStorage: true,
        });
        console.info("[HERA][ARMetrics] export ready", {
            api: "window.HERA_AR_METRICS.downloadJSON() / downloadCSV()",
        });
    }

    function sampleFrame(time) {
        const currentTime = Number.isFinite(Number(time)) ? Number(time) : nowMs();

        if (lastFrameTime != null) {
            const delta = currentTime - lastFrameTime;
            if (Number.isFinite(delta) && delta > 0 && delta < 1000) {
                frameTimes.push(delta);
                if (frameTimes.length > 240) frameTimes.shift();
            }
        }

        lastFrameTime = currentTime;
        return currentTime;
    }

    function getHudSnapshot() {
        if (!enabled || !renderer) return null;

        const scene = getScene?.() ?? null;
        const assetScene = getAssetScene?.() ?? scene;

        return createSample({
            renderer,
            frameTimes,
            sessionStartedAt,
            scene,
            assetScene,
            mode: getMode?.() ?? null,
            frame: null,
            memory: memorySnapshot,
            webglErrors,
            assets: assetsSnapshot,
        });
    }

    function maybeLogConsoleSnapshot(snapshot, wallNow) {
        if (!consoleLoggingEnabled || wallNow - lastConsoleLogAt < consoleLogIntervalMs) return;
        lastConsoleLogAt = wallNow;

        console.info("[HERA][ARMetrics] sample", {
            elapsedMs: snapshot.elapsedMs,
            mode: snapshot.mode,
            fps: snapshot.fps,
            p95FrameMs: snapshot.p95FrameMs,
            drawCalls: snapshot.renderer?.calls,
            rendererPoints: snapshot.renderer?.points,
            assets: snapshot.assets?.map(summarizeAssetForLog) ?? [],
        });
    }

    function sampleAfterRender(time, frame, meta = {}) {
        if (!enabled || !renderer) return null;
        const force = meta.force === true;

        if (!force && !sessionActive.value && !collectInline && !renderer.xr?.isPresenting) {
            return live.value;
        }

        sampleFrame(time);
        const wallNow = nowMs();

        if (!force && wallNow - lastSampleAt < sampleIntervalMs) return live.value;
        lastSampleAt = wallNow;

        if (wallNow - lastMemoryAt >= memoryIntervalMs) {
            memorySnapshot = getMemorySnapshot();
            lastMemoryAt = wallNow;
        }

        if (pollWebGlErrorsEnabled && wallNow - lastWebGlErrorAt >= webglErrorIntervalMs) {
            webglErrors = pollWebGlErrors(renderer);
            lastWebGlErrorAt = wallNow;
        }

        const scene = getScene?.() ?? null;
        const assetScene = getAssetScene?.() ?? scene;
        const camera = getCamera?.() ?? null;

        if (force || wallNow - lastAssetAt >= assetIntervalMs) {
            assetsSnapshot = collectAssets(assetScene, camera, {
                includeDetailedGeometry: includeDetailedAssetMetrics,
            });
            lastAssetAt = wallNow;
        }

        const snapshot = createSample({
            renderer,
            frameTimes,
            sessionStartedAt,
            scene,
            assetScene,
            mode: meta.mode ?? getMode?.() ?? null,
            frame,
            memory: memorySnapshot,
            webglErrors,
            assets: assetsSnapshot,
        });

        live.value = snapshot;
        history.push(snapshot);

        while (history.length > maxHistorySamples) {
            history.shift();
        }

        maybeLogConsoleSnapshot(snapshot, wallNow);
        maybeAutoSave(wallNow);

        return snapshot;
    }

    function getSnapshot() {
        return live.value;
    }

    function getSession() {
        return getExportPayload();
    }

    function clear() {
        reset();
        clearStoredSession();
    }

    function logSnapshot() {
        if (!enabled) return null;

        const snapshot = live.value ?? sampleAfterRender(nowMs(), null, { reason: "manual" });
        console.groupCollapsed("[HERA][ARMetrics] snapshot");
        console.table({
            scene: snapshot?.sceneTitle ?? snapshot?.sceneId ?? "-",
            mode: snapshot?.mode ?? "-",
            fps: snapshot?.fps ?? null,
            frameMs: snapshot?.frameMs ?? null,
            p95FrameMs: snapshot?.p95FrameMs ?? null,
            worstFrameMs: snapshot?.worstFrameMs ?? null,
            drawCalls: snapshot?.renderer?.calls ?? null,
            triangles: snapshot?.renderer?.triangles ?? null,
            points: snapshot?.renderer?.points ?? null,
            usedJSHeapMb: snapshot?.memory?.usedJSHeapMb ?? null,
            webglErrors: snapshot?.webglErrors?.join(", ") || "none",
        });
        console.table(snapshot?.assets ?? []);
        console.groupEnd();

        return snapshot;
    }

    const api = {
        enabled,
        overlayEnabled,
        hudEnabled,
        consoleLoggingEnabled,
        autoSaveEnabled,
        downloadOnEndEnabled,
        collectInline,
        sampleIntervalMs,
        maxHistorySamples,
        live,
        sessionActive,
        sessionEndCount,
        startSession,
        endSession,
        sampleAfterRender,
        getHudSnapshot,
        logSnapshot,
        getSnapshot,
        getSession,
        clear,
        downloadJSON,
        downloadCSV,
        exportJSON,
        exportCSV,
        exportJson: downloadJSON,
        exportCsv: downloadCSV,
        reset: clear,
        getExportPayload,
        getHistory: () => [...history],
    };

    if (enabled) {
        console.info("[HERA][ARMetrics] enabled", {
            sampleIntervalMs,
            assetIntervalMs,
            maxHistorySamples,
        });

        if (!overlayEnabled) {
            console.info("[HERA][ARMetrics] overlay disabled");
        }

        if (consoleLoggingEnabled) {
            console.info("[HERA][ARMetrics] console logging enabled");
        }

        if (autoSaveEnabled) {
            console.info("[HERA][ARMetrics] autosave enabled", {
                key: STORAGE_KEY,
                intervalMs: autoSaveIntervalMs,
            });
        }
    }

    if (enabled && typeof window !== "undefined") {
        window.HERA_AR_METRICS = api;
        window.heraArMetrics = api;
    }

    return api;
}
