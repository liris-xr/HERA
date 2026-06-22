import { ASSET_KINDS } from "../assetKinds.js";

export const DEFAULT_POINT_CLOUD_OPTIONS = Object.freeze({
    pointBudget: 2_000_000,
    minNodePixelSize: 1,
    pointSize: 1.6,
    opacity: 1,
    colorMode: "rgb",
    sizeType: "adaptive",
    shape: "square",
});

function normalizeUrl(url) {
    return String(url ?? "").replaceAll("\\", "/").trim();
}

function getEntryName(url) {
    const clean = normalizeUrl(url).split(/[?#]/)[0];
    const parts = clean.split("/");
    return parts[parts.length - 1] || "metadata.json";
}

function getBaseUrl(url) {
    const normalized = normalizeUrl(url);
    const slash = normalized.lastIndexOf("/");
    return slash === -1 ? "" : normalized.slice(0, slash + 1);
}

function resolveRelativeUrl(baseUrl, relativeUrl) {
    const relative = normalizeUrl(relativeUrl);
    if (/^https?:\/\//i.test(relative)) return relative;

    try {
        return new URL(relative, baseUrl).toString();
    } catch {
        return `${baseUrl}${relative}`;
    }
}

function parseByteRange(value) {
    const match = /^bytes=(\d+)-(\d+)$/i.exec(String(value ?? "").trim());
    if (!match) return null;

    const start = Number(match[1]);
    const end = Number(match[2]);

    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
        return null;
    }

    return { start, end };
}

function getRequestHeader(headers, name) {
    if (!headers) return null;
    if (typeof headers.get === "function") return headers.get(name);

    return headers[name] ?? headers[name.toLowerCase()] ?? null;
}

async function ensureRangeResponse(response, range) {
    if (!range || response.status === 206) return response;

    const buffer = await response.arrayBuffer();
    const { start, end } = range;

    if (response.status !== 200 || end >= buffer.byteLength) {
        throw new Error(
            `[Potree] Invalid range response: requested bytes=${start}-${end}, ` +
            `received status ${response.status} with ${buffer.byteLength} bytes`
        );
    }

    const sliced = buffer.slice(start, end + 1);
    const headers = new Headers(response.headers);
    headers.set("Content-Length", String(sliced.byteLength));
    headers.set("Content-Range", `bytes ${start}-${end}/${buffer.byteLength}`);

    return new Response(sliced, {
        status: 206,
        statusText: "Partial Content",
        headers,
    });
}

async function fetchPotreeResource(input, init = {}) {
    const range = parseByteRange(getRequestHeader(init?.headers, "Range"));
    const response = await fetch(input, {
        ...init,
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`[Potree] Failed to load ${input}: ${response.status} ${response.statusText}`);
    }

    return ensureRangeResponse(response, range);
}

function detectPotreeVersion(entryName, options = {}) {
    const explicit = options.version ?? options.potreeVersion ?? null;
    if (explicit === "v1" || explicit === "v2") return explicit;

    return entryName.toLowerCase() === "cloud.js" ? "v1" : "v2";
}

function pickEnum(map, value, fallback) {
    const key = String(value ?? "").toLowerCase();
    return map[key] ?? fallback;
}

function toPositiveNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toClampedOpacity(THREE, value) {
    const n = Number(value);
    return Number.isFinite(n) ? THREE.MathUtils.clamp(n, 0, 1) : DEFAULT_POINT_CLOUD_OPTIONS.opacity;
}

export function createPotreeStreamingLoader(dependencies) {
    const {
        THREE,
        Potree,
        PointColorType,
        PointShape,
        PointSizeType,
        resolveResourceUrl,
    } = dependencies;

    const colorTypes = {
        rgb: PointColorType.RGB,
        elevation: PointColorType.ELEVATION,
        intensity: PointColorType.INTENSITY,
        classification: PointColorType.CLASSIFICATION,
        lod: PointColorType.LOD,
    };

    const sizeTypes = {
        adaptive: PointSizeType.ADAPTIVE,
        attenuated: PointSizeType.ATTENUATED,
        fixed: PointSizeType.FIXED,
    };

    const shapes = {
        square: PointShape.SQUARE,
        circle: PointShape.CIRCLE,
        paraboloid: PointShape.PARABOLOID,
    };

    function applyMaterialSettings(pco, options = {}) {
        const material = pco?.material;
        if (!material) return;

        material.size = toPositiveNumber(
            options.pointSize ?? options.size,
            DEFAULT_POINT_CLOUD_OPTIONS.pointSize
        );
        material.opacity = toClampedOpacity(THREE, options.opacity);
        material.transparent = material.opacity < 1;
        material.depthWrite = material.opacity >= 1;
        material.pointColorType = pickEnum(colorTypes, options.colorMode, PointColorType.RGB);
        material.pointSizeType = pickEnum(sizeTypes, options.sizeType, PointSizeType.ADAPTIVE);
        material.shape = pickEnum(shapes, options.shape, PointShape.SQUARE);
    }

    class PotreeStreamingPointCloud extends THREE.Group {
        constructor({ potree, pointCloud, sourceUrl, version, options = {} }) {
            super();

            this.name = options.name || "Potree point cloud";
            this.potree = potree;
            this.pointCloud = pointCloud;
            this.pointClouds = [pointCloud];
            this.sourceUrl = sourceUrl;
            this.version = version;
            this.isPotreeStreamingPointCloud = true;
            this.userData.heraAssetKind = ASSET_KINDS.POINTCLOUD_STREAMING;

            this.setPointBudget(options.pointBudget);
            this.setMinNodePixelSize(options.minNodePixelSize);
            applyMaterialSettings(pointCloud, options);

            this.add(pointCloud);
        }

        updatePointCloudStreaming(camera, renderer) {
            if (!camera || !renderer || !this.pointCloud) return null;

            this.updateMatrixWorld(true);
            this.parent?.updateMatrixWorld(true);
            return this.potree.updatePointClouds(this.pointClouds, camera, renderer);
        }

        setPointBudget(value) {
            this.potree.pointBudget = toPositiveNumber(
                value,
                DEFAULT_POINT_CLOUD_OPTIONS.pointBudget
            );
        }

        setMinNodePixelSize(value) {
            this.pointCloud.minNodePixelSize = toPositiveNumber(
                value,
                DEFAULT_POINT_CLOUD_OPTIONS.minNodePixelSize
            );
        }

        setPointSize(value) {
            if (!this.pointCloud?.material) return;

            this.pointCloud.material.size = toPositiveNumber(
                value,
                DEFAULT_POINT_CLOUD_OPTIONS.pointSize
            );
        }

        setOpacity(value) {
            if (!this.pointCloud?.material) return;

            const opacity = toClampedOpacity(THREE, value);
            this.pointCloud.material.opacity = opacity;
            this.pointCloud.material.transparent = opacity < 1;
            this.pointCloud.material.depthWrite = opacity >= 1;
        }

        getBoundingBox() {
            const box = new THREE.Box3();
            const sourceBox = this.pointCloud?.boundingBox ?? this.pointCloud?.pcoGeometry?.boundingBox;

            if (sourceBox && !sourceBox.isEmpty()) {
                box.union(sourceBox.clone().applyMatrix4(this.pointCloud.matrix));
            }

            return box;
        }

        getStats() {
            return {
                version: this.version,
                pointBudget: this.potree.pointBudget,
                minNodePixelSize: this.pointCloud?.minNodePixelSize ?? null,
                visibleNodes: this.pointCloud?.visibleNodes?.length ?? 0,
                visiblePoints: this.pointCloud?.numVisiblePoints ?? 0,
                totalPoints: this.pointCloud?.pcoGeometry?.numPoints ?? null,
                progress: this.pointCloud?.progress ?? null,
            };
        }

        dispose() {
            this.pointCloud?.dispose?.();
            this.clear();
            this.pointCloud = null;
            this.pointClouds = [];
        }
    }

    async function loadPotreeStreamingPointCloud({ url, name, options = {} }) {
        const resolvedUrl = resolveResourceUrl(url);

        if (!resolvedUrl) {
            throw new Error("[loadPotreeStreamingPointCloud] Missing point cloud URL.");
        }

        const entryName = getEntryName(resolvedUrl);
        const baseUrl = getBaseUrl(resolvedUrl);
        const version = detectPotreeVersion(entryName, options);
        const potree = new Potree(version);
        const pointCloud = await potree.loadPointCloud(
            entryName,
            (relativeUrl) => resolveRelativeUrl(baseUrl, relativeUrl),
            fetchPotreeResource
        );

        return new PotreeStreamingPointCloud({
            potree,
            pointCloud,
            sourceUrl: resolvedUrl,
            version,
            options: {
                name,
                ...DEFAULT_POINT_CLOUD_OPTIONS,
                ...options,
            },
        });
    }

    return {PotreeStreamingPointCloud, loadPotreeStreamingPointCloud,};
}
