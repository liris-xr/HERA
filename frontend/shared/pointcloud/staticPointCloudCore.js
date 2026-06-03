import { ASSET_KINDS } from "../assetKinds.js";

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function safeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function hasVertexColors(geometry) {
    return !!geometry?.attributes?.color;
}

function getPointCount(geometry) {
    return geometry?.attributes?.position?.count ?? 0;
}

function inferPointSize(THREE, geometry, options = {}) {
    const explicitSize = Number(options.pointSize ?? options.size);
    if (Number.isFinite(explicitSize) && explicitSize > 0) return explicitSize;

    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box || box.isEmpty()) return 0.01;

    const size = new THREE.Vector3();
    box.getSize(size);

    const diagonal = size.length();
    if (!Number.isFinite(diagonal) || diagonal <= 0) return 0.01;

    const inferred = diagonal / 1200;
    const minSize = safeNumber(options.minPointSize, 0.003);
    const maxSize = safeNumber(options.maxPointSize, Infinity);
    return clamp(inferred, minSize, maxSize);
}

async function loadGeometry({ loader, url, file, resolveResourceUrl }) {
    if (file) {
        const buffer = await file.arrayBuffer();
        return loader.parse(buffer);
    }

    if (!url) {
        throw new Error("[StaticPointCloud] Missing PLY url.");
    }

    return await loader.loadAsync(resolveResourceUrl(url));
}

export function createStaticPointCloudLoader({THREE, PLYLoader, resolveResourceUrl,}) {
    if (!THREE) throw new Error("[StaticPointCloud] THREE is required.");
    if (!PLYLoader) throw new Error("[StaticPointCloud] PLYLoader is required.");
    if (typeof resolveResourceUrl !== "function") {
        throw new Error("[StaticPointCloud] resolveResourceUrl is required.");
    }

    async function loadStaticPointCloud({
        url = null,
        file = null,
        name = "PLY point cloud",
        options = {},
    } = {}) {
        const loader = new PLYLoader();
        const geometry = await loadGeometry({ loader, url, file, resolveResourceUrl });
        const position = geometry?.attributes?.position;

        if (!position || position.count === 0) {
            geometry?.dispose?.();
            throw new Error("[StaticPointCloud] PLY file does not contain vertex positions.");
        }

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        const opacity = clamp(safeNumber(options.opacity, 1), 0, 1);
        const material = new THREE.PointsMaterial({
            size: inferPointSize(THREE, geometry, options),
            sizeAttenuation: options.sizeAttenuation ?? true,
            color: options.color ?? 0xffffff,
            vertexColors: hasVertexColors(geometry),
            opacity,
            transparent: opacity < 1,
            depthWrite: opacity >= 1,
        });

        const points = new THREE.Points(geometry, material);
        points.name = name;
        points.userData.heraAssetKind = ASSET_KINDS.POINTCLOUD;
        points.userData.pointCloudFormat = "ply";
        points.userData.pointCount = getPointCount(geometry);
        points.frustumCulled = options.frustumCulled ?? true;

        points.getBoundingBox = () => {
            geometry.computeBoundingBox();
            return geometry.boundingBox.clone();
        };

        points.getStats = () => ({
            format: "ply",
            pointCount: getPointCount(geometry),
            visiblePoints: getPointCount(geometry),
            visibleNodes: 1,
            streaming: false,
        });

        points.dispose = () => {
            geometry.dispose();
            material.dispose();
        };

        return points;
    }

    return { loadStaticPointCloud };
}
