function hasPerfDebugFlag() {
    if (typeof window === "undefined") return false;

    try {
        return (
            new URLSearchParams(window.location.search).has("perfDebug") ||
            window.localStorage?.getItem("heraPerfDebug") === "1"
        );
    } catch {
        return false;
    }
}

function makeVector2Target() {
    return {
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
}

function bytesToMb(bytes) {
    return Number((bytes / (1024 * 1024)).toFixed(2));
}

function collectSceneStats(scene) {
    const stats = {
        totalMeshes: 0,
        visibleMeshes: 0,
        shadowCasters: 0,
        shadowReceivers: 0,
        shadowLights: 0,
        shadowPasses: 0,
        shadowMapPixels: 0,
    };

    if (!scene || typeof scene.traverse !== "function") return stats;

    scene.traverse((obj) => {
        if (obj?.isMesh) {
            stats.totalMeshes += 1;
            if (obj.visible) stats.visibleMeshes += 1;
            if (obj.castShadow) stats.shadowCasters += 1;
            if (obj.receiveShadow) stats.shadowReceivers += 1;
        }

        if (obj?.isLight && obj.castShadow && obj.shadow) {
            stats.shadowLights += 1;
            const size = obj.shadow.mapSize;
            const passCount = obj.isPointLight ? 6 : 1;
            stats.shadowPasses += passCount;
            stats.shadowMapPixels += ((size?.x ?? 0) * (size?.y ?? 0)) * passCount;
        }
    });

    return stats;
}

function getDeviceSnapshot() {
    if (typeof window === "undefined") return {};

    return {
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio ?? null,
        deviceMemoryGb: navigator.deviceMemory ?? null,
        cpuLogicalCores: navigator.hardwareConcurrency ?? null,
        maxTouchPoints: navigator.maxTouchPoints ?? null,
        userAgent: navigator.userAgent,
    };
}

export function createPerfDebugLogger({
    name,
    renderer,
    getScene,
    getCamera,
    intervalMs = 2000,
}) {
    const enabled = hasPerfDebugFlag();
    const drawSize = makeVector2Target();
    const frameStats = {
        lastNow: null,
        frames: 0,
        totalMs: 0,
        worstMs: 0,
    };

    let lastLogAt = 0;
    let initialLogged = false;

    function getRendererSnapshot() {
        renderer.getDrawingBufferSize(drawSize);

        const cssWidth = renderer.domElement?.clientWidth ?? 0;
        const cssHeight = renderer.domElement?.clientHeight ?? 0;
        const cssPixels = cssWidth * cssHeight;
        const drawingPixels = drawSize.x * drawSize.y;
        const sceneStats = collectSceneStats(getScene?.());
        const info = renderer.info;

        return {
            cssSize: `${cssWidth}x${cssHeight}`,
            drawingBuffer: `${drawSize.x}x${drawSize.y}`,
            canvasAttributeSize: `${renderer.domElement?.width ?? 0}x${renderer.domElement?.height ?? 0}`,
            customRendererScaling: renderer.scaling ?? null,
            cssMP: Number((cssPixels / 1000000).toFixed(2)),
            drawingBufferMP: Number((drawingPixels / 1000000).toFixed(2)),
            estimatedColorBufferMB: bytesToMb(drawingPixels * 4),
            rendererPixelRatio: renderer.getPixelRatio?.() ?? null,
            pixelMultiplierVsCss: cssPixels > 0
                ? Number((drawingPixels / cssPixels).toFixed(2))
                : null,
            shadowMapEnabled: !!renderer.shadowMap?.enabled,
            shadowMapType: renderer.shadowMap?.type,
            shadowLights: sceneStats.shadowLights,
            shadowPassesEstimate: sceneStats.shadowPasses,
            shadowCasters: sceneStats.shadowCasters,
            shadowReceivers: sceneStats.shadowReceivers,
            shadowDrawWorkEstimate: sceneStats.shadowPasses * sceneStats.shadowCasters,
            estimatedShadowMapMP: Number((sceneStats.shadowMapPixels / 1000000).toFixed(2)),
            estimatedShadowMapMB: bytesToMb(sceneStats.shadowMapPixels * 4),
            visibleMeshes: sceneStats.visibleMeshes,
            totalMeshes: sceneStats.totalMeshes,
            drawCalls: info?.render?.calls ?? null,
            triangles: info?.render?.triangles ?? null,
            lines: info?.render?.lines ?? null,
            points: info?.render?.points ?? null,
            geometriesInMemory: info?.memory?.geometries ?? null,
            texturesInMemory: info?.memory?.textures ?? null,
            cameraType: getCamera?.()?.type ?? null,
        };
    }

    function logInitial() {
        if (!enabled || initialLogged) return;
        initialLogged = true;

        console.groupCollapsed(`[HERA PERF][${name}] initial`);
        console.table(getDeviceSnapshot());
        console.table(getRendererSnapshot());
        console.info(
            "[HERA PERF] Notes: this is instrumentation only. It does not change DPR, shadows, LOD, cache, or assets."
        );
        console.groupEnd();
    }

    function logFrame(time, reason = "interval") {
        if (!enabled || !renderer) return;

        logInitial();

        const now = typeof performance !== "undefined" ? performance.now() : time;
        if (frameStats.lastNow != null) {
            const delta = now - frameStats.lastNow;
            if (Number.isFinite(delta) && delta > 0) {
                frameStats.frames += 1;
                frameStats.totalMs += delta;
                frameStats.worstMs = Math.max(frameStats.worstMs, delta);
            }
        }
        frameStats.lastNow = now;

        if (now - lastLogAt < intervalMs) return;
        lastLogAt = now;

        const avgMs = frameStats.frames > 0 ? frameStats.totalMs / frameStats.frames : 0;
        const snapshot = {
            ...getRendererSnapshot(),
            avgFrameMs: Number(avgMs.toFixed(2)),
            avgFps: avgMs > 0 ? Number((1000 / avgMs).toFixed(1)) : null,
            worstFrameMs: Number(frameStats.worstMs.toFixed(2)),
            samples: frameStats.frames,
        };

        console.groupCollapsed(`[HERA PERF][${name}] ${reason}`);
        console.table(snapshot);
        console.groupEnd();

        frameStats.frames = 0;
        frameStats.totalMs = 0;
        frameStats.worstMs = 0;
    }

    return {
        enabled,
        logInitial,
        logFrame,
        logSnapshot(reason = "manual") {
            if (!enabled) return;
            console.groupCollapsed(`[HERA PERF][${name}] ${reason}`);
            console.table(getRendererSnapshot());
            console.groupEnd();
        },
    };
}
