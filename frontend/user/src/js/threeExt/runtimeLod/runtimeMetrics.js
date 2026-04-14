import * as THREE from "three";

const _box = new THREE.Box3();
const _sphere = new THREE.Sphere();
const _centerCamera = new THREE.Vector3();
const _size = new THREE.Vector3();
const _viewport = new THREE.Vector2();

function makeEmptyMetrics(overrides = {}) {
    return {
        cameraDepth: Infinity,

        rawWidthRatio: 0,
        rawHeightRatio: 0,
        rawCoverage: 0,

        visibleWidthRatio: 0,
        visibleHeightRatio: 0,
        visibleCoverage: 0,

        screenWidthPx: 0,
        screenHeightPx: 0,

        bboxSize: { x: 0, y: 0, z: 0 },
        sphereRadius: 0,

        isBehindCamera: false,

        screenDiameterRatio: 0,
        screenRadiusRatio: 0,

        ...overrides,
    };
}

export function buildAssetRuntimeMetrics(asset, camera, renderer = null) {
    if (!asset?.object || !camera || !renderer) {
        return makeEmptyMetrics();
    }

    asset.object.updateWorldMatrix(true, true);
    camera.updateMatrixWorld(true);

    _box.setFromObject(asset.object);
    if (_box.isEmpty()) {
        return makeEmptyMetrics();
    }

    _box.getSize(_size);
    _box.getBoundingSphere(_sphere);

    _centerCamera.copy(_sphere.center).applyMatrix4(camera.matrixWorldInverse);

    const centerDepth = -_centerCamera.z;

    // Reject only if whole sphere is behind the camera
    if (centerDepth + _sphere.radius <= 0) {
        return makeEmptyMetrics({
            cameraDepth: Math.max(centerDepth, 0),
            bboxSize: { x: _size.x, y: _size.y, z: _size.z },
            sphereRadius: _sphere.radius,
            isBehindCamera: true,
        });
    }

    renderer.getDrawingBufferSize(_viewport);
    const viewportWidth = Math.max(_viewport.x, 1);
    const viewportHeight = Math.max(_viewport.y, 1);

    let rawWidthRatio = 0;
    let rawHeightRatio = 0;

    if (camera.isPerspectiveCamera) {
        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        const tanHalfFovY = Math.tan(fovRad / 2);

        // Avoid explosion when camera is too close / inside the sphere
        const safeDepth = Math.max(centerDepth, _sphere.radius * 0.25, 0.001);

        rawHeightRatio = (_sphere.radius / safeDepth) / tanHalfFovY;
        rawWidthRatio = rawHeightRatio / camera.aspect;
    } else if (camera.isOrthographicCamera) {
        const orthoHeight = Math.max(camera.top - camera.bottom, 0.0001);
        const orthoWidth = Math.max(camera.right - camera.left, 0.0001);

        rawHeightRatio = (2 * _sphere.radius) / orthoHeight;
        rawWidthRatio = (2 * _sphere.radius) / orthoWidth;
    }

    rawWidthRatio = Number.isFinite(rawWidthRatio) ? Math.max(rawWidthRatio, 0) : 0;
    rawHeightRatio = Number.isFinite(rawHeightRatio) ? Math.max(rawHeightRatio, 0) : 0;

    // Clamped ratios = actual visible fractions of screen dimensions
    const visibleWidthRatio = Math.min(rawWidthRatio, 1);
    const visibleHeightRatio = Math.min(rawHeightRatio, 1);

    // Approximate area coverage
    const rawCoverage = rawWidthRatio * rawHeightRatio;
    const visibleCoverage = visibleWidthRatio * visibleHeightRatio;

    const screenWidthPx = visibleWidthRatio * viewportWidth;
    const screenHeightPx = visibleHeightRatio * viewportHeight;

    return makeEmptyMetrics({
        cameraDepth: Math.max(centerDepth, 0),

        rawWidthRatio,
        rawHeightRatio,
        rawCoverage,

        visibleWidthRatio,
        visibleHeightRatio,
        visibleCoverage,

        screenWidthPx,
        screenHeightPx,

        bboxSize: { x: _size.x, y: _size.y, z: _size.z },
        sphereRadius: _sphere.radius,

        isBehindCamera: false,

        screenDiameterRatio: Math.max(rawWidthRatio, rawHeightRatio),
        screenRadiusRatio: Math.max(rawWidthRatio, rawHeightRatio) * 0.5,
    });
}