import * as THREE from "three";
import { getAssetExtension } from "../assetKinds.js";
import { getObjectBoundingBox } from "./splatBounds.js";

const _size = new THREE.Vector3();
const _center = new THREE.Vector3();
const _sphere = new THREE.Sphere();

function safeRound(value, digits = 3) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const factor = 10 ** digits;
    return Math.round(n * factor) / factor;
}

function readStorageFlag(key) {
    if (typeof window === "undefined") return false;

    try {
        return window.localStorage?.getItem(key) === "1";
    } catch {
        return false;
    }
}

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

function searchHasAny(names) {
    if (typeof window === "undefined") return false;

    try {
        return getDebugUrlParams().some((params) =>
            names.some((name) => params.get(name) === "1" || params.has(name))
        );
    } catch {
        return false;
    }
}

export function hasSplatDebugFlag() {
    return (
        searchHasAny(["splatDebug", "perfDebug"]) ||
        readStorageFlag("heraSplatDebug") ||
        readStorageFlag("heraPerfDebug")
    );
}

export function hasSplatNoAutoFitFlag() {
    return searchHasAny(["splatNoAutoFit"]);
}

export function getSplatDebugVariantOverride() {
    if (typeof window === "undefined") return null;

    try {
        for (const params of getDebugUrlParams()) {
            if (params.get("disableSparkRad") === "1" || params.has("disableSparkRad")) {
                return "original";
            }

            const raw = String(params.get("splatVariant") ?? "").trim().toLowerCase();
            if (!raw) continue;
            if (raw === "original") return "original";
            if (raw === "sparkrad" || raw === "spark-rad" || raw === "rad") return "sparkRad";
        }
    } catch {
        return null;
    }

    return null;
}

function maybeCallNumber(fn) {
    if (typeof fn !== "function") return null;

    try {
        const value = fn();
        return Number.isFinite(Number(value)) ? Number(value) : null;
    } catch {
        return null;
    }
}

function firstNumber(values) {
    for (const value of values) {
        const n = Number(value);
        if (Number.isFinite(n) && n >= 0) return n;
    }

    return null;
}

export function getSplatCount(object) {
    const source = object?.splats ?? object?.packedSplats ?? object?.extSplats ?? object?.paged ?? null;

    return firstNumber([
        object?.numSplats,
        object?.splatCount,
        object?.splatCountTotal,
        maybeCallNumber(object?.getSplatCount?.bind(object)),
        maybeCallNumber(source?.getNumSplats?.bind(source)),
        source?.numSplats,
        object?.packedSplats?.numSplats,
        object?.extSplats?.numSplats,
        object?.paged?.numSplats,
        object?.context?.splats?.numSplats,
        maybeCallNumber(object?.context?.splats?.getNumSplats?.bind(object.context.splats)),
        object?.raycastIndices?.numSplats,
    ]);
}

function vectorSnapshot(v) {
    if (!v) return null;
    return {
        x: safeRound(v.x),
        y: safeRound(v.y),
        z: safeRound(v.z),
    };
}

export function getSplatBounds(object) {
    if (!object) return null;

    try {
        const boundsInfo = getObjectBoundingBox(object, {
            preferCustom: true,
            applyMatrixWorld: true,
        });
        const box = boundsInfo.box;

        if (!boundsInfo.valid) {
            return {
                valid: false,
                empty: boundsInfo.empty,
                source: boundsInfo.source,
                error: boundsInfo.error ?? null,
                min: vectorSnapshot(box?.min),
                max: vectorSnapshot(box?.max),
            };
        }

        box.getSize(_size);
        box.getCenter(_center);
        box.getBoundingSphere(_sphere);

        return {
            valid: true,
            empty: false,
            source: boundsInfo.source,
            center: vectorSnapshot(_center),
            size: vectorSnapshot(_size),
            radius: safeRound(_sphere.radius),
        };
    } catch (error) {
        return {
            error: error?.message ?? String(error),
        };
    }
}

export function getRendererDiagnostics(renderer) {
    if (!renderer) return null;

    return {
        type: renderer.constructor?.name ?? renderer.type ?? "WebGLRenderer",
        pixelRatio: renderer.getPixelRatio?.() ?? null,
        outputColorSpace: renderer.outputColorSpace ?? null,
        toneMapping: renderer.toneMapping ?? null,
        toneMappingExposure: renderer.toneMappingExposure ?? null,
        sortObjects: renderer.sortObjects ?? null,
        shadowMapEnabled: renderer.shadowMap?.enabled ?? null,
        shadowMapType: renderer.shadowMap?.type ?? null,
        xrEnabled: renderer.xr?.enabled ?? null,
        xrPresenting: renderer.xr?.isPresenting ?? null,
        info: {
            calls: renderer.info?.render?.calls ?? null,
            triangles: renderer.info?.render?.triangles ?? null,
            points: renderer.info?.render?.points ?? null,
            geometries: renderer.info?.memory?.geometries ?? null,
            textures: renderer.info?.memory?.textures ?? null,
        },
    };
}

export function getSparkModuleVersion(sparkModule) {
    return sparkModule?.version ?? sparkModule?.VERSION ?? sparkModule?.SparkRenderer?.version ?? null;
}

function getWarnings({ object, renderer, bounds, splatCount }) {
    const warnings = [];

    if (splatCount != null && splatCount > 1_500_000) {
        warnings.push("High splat count; mobile devices may struggle without a compressed/LOD splat pipeline.");
    }

    if (renderer?.getPixelRatio?.() > 2) {
        warnings.push("Renderer pixel ratio is above 2; splats are fragment-heavy at high DPR.");
    }

    if (object?.enableLod === false) {
        warnings.push("Spark object reports enableLod=false.");
    }

    if (bounds?.valid === false) {
        warnings.push("Bounding box is invalid; HERA will skip bbox-based placement/camera fitting for this splat.");
    }

    if (bounds?.empty) {
        warnings.push("Bounding box is empty; camera fit/culling/debug metrics may be unreliable.");
    }

    if (bounds?.radius != null && bounds.radius > 1000) {
        warnings.push("Very large bounding radius; scale/units may be wrong for viewer navigation.");
    }

    return warnings;
}

function sanitizeOptions(options) {
    if (!options || typeof options !== "object") return options ?? null;

    const result = {};
    for (const [key, value] of Object.entries(options)) {
        if (key === "fileBytes") {
            result.fileBytes = value?.byteLength != null
                ? { byteLength: value.byteLength }
                : Boolean(value);
            continue;
        }

        if (key === "stream") {
            result.stream = Boolean(value);
            continue;
        }

        result[key] = value;
    }

    return result;
}

export function buildSplatDebugPayload({
    asset = null,
    object = null,
    renderer = null,
    url = null,
    kind = "splat",
    phase = null,
    loadMs = null,
    options = null,
    sparkModule = null,
    manifest = null,
    source = null,
} = {}) {
    const bounds = getSplatBounds(object);
    const splatCount = getSplatCount(object);

    return {
        phase,
        asset: {
            id: asset?.id ?? object?.userData?.assetId ?? null,
            name: asset?.name ?? object?.name ?? null,
            kind,
            sourceUrl: url ?? asset?.sourceUrl ?? null,
            extension: getAssetExtension(url ?? asset?.sourceUrl ?? asset?.name ?? ""),
            fileSizeBytes: manifest?.metrics?.assetSizeBytes ?? asset?.uploadData?.size ?? null,
            fromUpload: !!asset?.uploadData,
        },
        spark: {
            packageVersion: getSparkModuleVersion(sparkModule),
            packageName: "@sparkjsdev/spark",
            options: sanitizeOptions(options),
        },
        loadMs: loadMs == null ? null : safeRound(loadMs, 2),
        object: object ? {
            type: object.type ?? null,
            isObject3D: object.isObject3D ?? null,
            visible: object.visible ?? null,
            position: vectorSnapshot(object.position),
            rotation: vectorSnapshot(object.rotation),
            scale: vectorSnapshot(object.scale),
            splatCount,
            enableLod: object.enableLod ?? null,
            lodScale: object.lodScale ?? null,
            isInitialized: object.isInitialized ?? null,
            bounds,
        } : null,
        renderer: getRendererDiagnostics(renderer),
        source,
        warnings: getWarnings({ object, renderer, bounds, splatCount }),
    };
}

export function logSplatDebug(event, payload) {
    if (!hasSplatDebugFlag()) return;

    const label = `[HERA][SplatDebug] ${event}`;
    console.groupCollapsed(label);
    console.info(payload);

    if (payload?.warnings?.length) {
        console.warn("[HERA][SplatDebug] warnings", payload.warnings);
    }

    console.groupEnd();
}

export function logSplatSourceDebug(message, payload = {}) {
    if (!hasSplatDebugFlag()) return;
    console.info(`[HERA][SplatSource] ${message}`, payload);
}
