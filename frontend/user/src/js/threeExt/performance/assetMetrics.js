import * as THREE from "three";
import { ASSET_KINDS } from "@shared/assetKinds.js";

const _objectStaticStats = new WeakMap();
const _worldPosition = new THREE.Vector3();

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

function getAttributeBytes(attribute) {
    return attribute?.array?.byteLength ?? 0;
}

function getGeometryBytes(geometry) {
    if (!geometry) return 0;

    let bytes = 0;

    for (const attribute of Object.values(geometry.attributes ?? {})) {
        bytes += getAttributeBytes(attribute);
    }

    bytes += getAttributeBytes(geometry.index);
    return bytes;
}

function countTextureValues(material, textureSet) {
    if (!material) return;

    const materials = Array.isArray(material) ? material : [material];
    for (const mat of materials) {
        if (!mat) continue;

        for (const value of Object.values(mat)) {
            if (value?.isTexture) textureSet.add(value);
        }
    }
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

function asPositiveNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

function getFirstNumber(values) {
    for (const value of values) {
        const n = asPositiveNumber(value);
        if (n != null) return n;
    }

    return null;
}

function inferSplatCount(object, stats) {
    const splatSource = object?.splats ?? object?.packedSplats ?? object?.extSplats ?? object?.paged ?? null;

    return getFirstNumber([
        object?.numSplats,
        object?.splatCount,
        object?.splatCountTotal,
        object?.numPoints,
        object?.pointCount,
        maybeCallNumber(object?.getSplatCount?.bind(object)),
        maybeCallNumber(object?.getPointCount?.bind(object)),
        maybeCallNumber(splatSource?.getNumSplats?.bind(splatSource)),
        splatSource?.numSplats,
        object?.packedSplats?.numSplats,
        object?.extSplats?.numSplats,
        object?.paged?.numSplats,
        object?.context?.splats?.numSplats,
        maybeCallNumber(object?.context?.splats?.getNumSplats?.bind(object.context.splats)),
        object?.raycastIndices?.numSplats,
        stats.pointVertices,
    ]);
}

function findSparkRendererForObject(object) {
    let current = object;

    while (current) {
        const sparkRenderer = current.userData?.heraSparkRenderer;
        if (sparkRenderer && typeof sparkRenderer === "object") return sparkRenderer;
        current = current.parent;
    }

    return null;
}

function getSplatRuntimeStats(object, totalSplats) {
    if (!object) return null;

    const source = object.splats ?? object.packedSplats ?? object.extSplats ?? object.paged ?? null;
    const sparkRenderer = findSparkRendererForObject(object);
    const sourceSplats = getFirstNumber([
        maybeCallNumber(source?.getNumSplats?.bind(source)),
        source?.numSplats,
    ]);
    const lodInstance = sparkRenderer?.lodInstances?.get?.(object) ?? null;

    return {
        totalSplats,
        sourceSplats,
        activeSplats: asPositiveNumber(sparkRenderer?.activeSplats),
        lodSplats: asPositiveNumber(lodInstance?.numSplats),
        maxSplats: getFirstNumber([
            object?.maxSplats,
            source?.maxSplats,
            sparkRenderer?.maxSplats,
        ]),
        lodEnabled: object.enableLod ?? null,
        lodScale: asPositiveNumber(object.lodScale),
        isInitialized: object.isInitialized ?? null,
    };
}

function buildStaticObjectStats(object) {
    const geometrySet = new Set();
    const materialSet = new Set();
    const textureSet = new Set();

    const stats = {
        objectCount: 0,
        meshCount: 0,
        pointsObjectCount: 0,
        lineObjectCount: 0,
        materialCount: 0,
        textureCount: 0,
        geometryCount: 0,
        vertices: 0,
        triangles: 0,
        pointVertices: 0,
        lineVertices: 0,
        estimatedGeometryBytes: 0,
        estimatedGeometryMb: 0,
        inferredSplatCount: null,
    };

    object?.traverse?.((child) => {
        stats.objectCount += 1;

        const geometry = child.geometry;
        const positionCount = geometry?.attributes?.position?.count ?? 0;

        if (child.isMesh) {
            stats.meshCount += 1;
            stats.triangles += geometry?.index
                ? Math.floor((geometry.index.count ?? 0) / 3)
                : Math.floor(positionCount / 3);
        }

        if (child.isPoints) {
            stats.pointsObjectCount += 1;
            stats.pointVertices += positionCount;
        }

        if (child.isLine || child.isLineSegments || child.isLineLoop) {
            stats.lineObjectCount += 1;
            stats.lineVertices += positionCount;
        }

        if (geometry && !geometrySet.has(geometry)) {
            geometrySet.add(geometry);
            stats.geometryCount += 1;
            stats.vertices += positionCount;
            stats.estimatedGeometryBytes += getGeometryBytes(geometry);
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
            if (!material || materialSet.has(material)) continue;
            materialSet.add(material);
            stats.materialCount += 1;
        }

        countTextureValues(child.material, textureSet);
    });

    stats.textureCount = textureSet.size;
    stats.estimatedGeometryMb = bytesToMb(stats.estimatedGeometryBytes);
    stats.inferredSplatCount = inferSplatCount(object, stats);

    return stats;
}

function getStaticObjectStats(object) {
    if (!object) return null;

    const cached = _objectStaticStats.get(object);
    if (cached) return cached;

    const stats = buildStaticObjectStats(object);
    _objectStaticStats.set(object, stats);
    return stats;
}

function getPotreeStats(asset, object) {
    const baseStats = object?.getStats?.() ?? asset?.getPointCloudStats?.() ?? null;
    const pointCloud = object?.pointCloud ?? object;
    if (!baseStats && !pointCloud) return null;

    return {
        ...(baseStats ?? {}),
        pointBudget: baseStats?.pointBudget ?? pointCloud?.pointBudget ?? object?.potree?.pointBudget ?? null,
        visibleNodes: baseStats?.visibleNodes ?? pointCloud?.visibleNodes?.length ?? null,
        visiblePoints: baseStats?.visiblePoints ?? pointCloud?.numVisiblePoints ?? null,
        loadedNodes: baseStats?.loadedNodes ?? pointCloud?.loadedNodes?.length ?? pointCloud?.nodes?.size ?? null,
        loadedPoints: baseStats?.loadedPoints ?? pointCloud?.numLoadedPoints ?? pointCloud?.loadedPoints ?? null,
        totalPoints: baseStats?.totalPoints ?? pointCloud?.pcoGeometry?.numPoints ?? pointCloud?.numPoints ?? null,
        progress: baseStats?.progress ?? pointCloud?.progress ?? null,
        minNodePixelSize: baseStats?.minNodePixelSize ?? pointCloud?.minNodePixelSize ?? null,
    };
}

function makeLightweightStats(object, kind) {
    const inferredSplatCount = kind === ASSET_KINDS.SPLAT
        ? inferSplatCount(object, { pointVertices: 0 })
        : null;

    return {
        objectCount: 1,
        meshCount: 0,
        pointsObjectCount: object?.isPoints ? 1 : 0,
        lineObjectCount: 0,
        materialCount: object?.material ? 1 : 0,
        textureCount: 0,
        geometryCount: object?.geometry ? 1 : 0,
        vertices: object?.geometry?.attributes?.position?.count ?? 0,
        triangles: 0,
        pointVertices: object?.geometry?.attributes?.position?.count ?? 0,
        lineVertices: 0,
        estimatedGeometryBytes: object?.geometry ? getGeometryBytes(object.geometry) : null,
        estimatedGeometryMb: object?.geometry ? bytesToMb(getGeometryBytes(object.geometry)) : null,
        inferredSplatCount,
    };
}

function getCameraDistance(object, camera) {
    if (!object || !camera) return null;

    object.getWorldPosition(_worldPosition);
    const dx = _worldPosition.x - camera.position.x;
    const dy = _worldPosition.y - camera.position.y;
    const dz = _worldPosition.z - camera.position.z;

    return round(Math.sqrt(dx * dx + dy * dy + dz * dz), 3);
}

export function collectAssetMetrics(asset, camera = null, options = {}) {
    const object = asset?.object ?? asset?.mesh ?? null;
    if (!asset || !object) return null;

    const kind =
        asset.assetKind ??
        asset.kind ??
        object.userData?.heraAssetKind ??
        null;
    const isStreamingPointCloud =
        kind === ASSET_KINDS.POINTCLOUD_STREAMING ||
        object?.isPotreeStreamingPointCloud === true;
    const pointCloudStats = isStreamingPointCloud
        ? getPotreeStats(asset, object)
        : null;
    const shouldSkipDeepTraversal =
        kind === ASSET_KINDS.POINTCLOUD_STREAMING ||
        kind === ASSET_KINDS.SPLAT;
    const staticStats = shouldSkipDeepTraversal
        ? makeLightweightStats(object, kind)
        : getStaticObjectStats(object);
    const splatStats = kind === ASSET_KINDS.SPLAT
        ? getSplatRuntimeStats(object, staticStats.inferredSplatCount)
        : null;

    return {
        id: asset.id ?? object.userData?.assetId ?? null,
        name: asset.name ?? object.name ?? null,
        kind,
        objectType: object.type ?? null,
        visible: object.visible !== false,
        currentVariant: asset.currentVariant ?? null,
        sourceUrl: asset.sourceUrl ?? null,
        cameraDistance: getCameraDistance(object, camera),

        objectCount: staticStats.objectCount,
        meshCount: staticStats.meshCount,
        pointsObjectCount: staticStats.pointsObjectCount,
        lineObjectCount: staticStats.lineObjectCount,
        geometryCount: staticStats.geometryCount,
        materialCount: staticStats.materialCount,
        textureCount: staticStats.textureCount,

        vertices: staticStats.vertices,
        triangles: staticStats.triangles,
        staticPointVertices: staticStats.pointVertices,
        geometryPositionCount: object?.geometry?.attributes?.position?.count ?? null,
        inferredSplatCount: staticStats.inferredSplatCount,
        estimatedGeometryBytes: staticStats.estimatedGeometryBytes,
        estimatedGeometryMb: staticStats.estimatedGeometryMb,

        pointCloud: pointCloudStats
            ? {
                version: pointCloudStats.version ?? null,
                pointBudget: pointCloudStats.pointBudget ?? null,
                visibleNodes: pointCloudStats.visibleNodes ?? null,
                visiblePoints: pointCloudStats.visiblePoints ?? null,
                loadedNodes: pointCloudStats.loadedNodes ?? pointCloudStats.visibleNodes ?? null,
                loadedPoints: pointCloudStats.loadedPoints ?? pointCloudStats.visiblePoints ?? null,
                totalPoints: pointCloudStats.totalPoints ?? null,
                estimated: pointCloudStats.visiblePoints == null && pointCloudStats.loadedPoints == null,
                progress: pointCloudStats.progress ?? null,
                minNodePixelSize: pointCloudStats.minNodePixelSize ?? null,
            }
            : null,
        splat: splatStats,
    };
}
