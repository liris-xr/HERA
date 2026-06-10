import * as THREE from "three";

const _viewerPosition = new THREE.Vector3();
const _viewerQuaternion = new THREE.Quaternion();
const _hudWorldPosition = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3();
const _parentInverse = new THREE.Matrix4();
const _worldMatrix = new THREE.Matrix4();
const _localMatrix = new THREE.Matrix4();
const _hudScale = new THREE.Vector3(0.42, 0.18, 1);

function formatNumber(value, digits = 1) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(digits) : "-";
}

function formatCount(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${Math.round(n)}`;
}

function getPrimaryAsset(snapshot) {
    return snapshot?.assets?.find((asset) => asset?.visible !== false) ?? snapshot?.assets?.[0] ?? null;
}

function getAssetMetricLabel(asset) {
    if (!asset) return "asset -";

    if (asset.kind === "splat") {
        const count = asset.splat?.activeSplats ?? asset.splat?.lodSplats ?? asset.splat?.totalSplats;
        return `splat ${formatCount(count)}`;
    }

    if (asset.kind === "pointcloud-streaming") {
        const count = asset.pointCloud?.visiblePoints ?? asset.pointCloud?.loadedPoints ?? asset.pointCloud?.totalPoints;
        return `points ${formatCount(count)}`;
    }

    if (asset.kind === "pointcloud") {
        return `points ${formatCount(asset.staticPointVertices ?? asset.geometryPositionCount)}`;
    }

    return `tris ${formatCount(asset.triangles)}`;
}

function getMemoryLabel(snapshot, asset) {
    const jsHeap = snapshot?.memory?.usedJSHeapMb;
    if (Number.isFinite(Number(jsHeap))) return `mem ${formatNumber(jsHeap, 0)} MB`;

    const geometryMb = asset?.estimatedGeometryMb;
    if (Number.isFinite(Number(geometryMb))) return `geom ${formatNumber(geometryMb, 1)} MB`;

    return "mem -";
}

function drawHud(canvas, context, snapshot) {
    const renderer = snapshot?.renderer ?? {};
    const asset = getPrimaryAsset(snapshot);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(8, 12, 18, 0.92)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgb(64, 176, 255)";
    context.lineWidth = 6;
    context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    context.fillStyle = "rgb(255, 255, 255)";
    context.font = "700 40px Arial";
    context.fillText(`FPS ${formatNumber(snapshot?.fps, 1)}`, 24, 52);

    context.font = "500 24px Arial";
    context.fillStyle = "rgb(220, 236, 255)";
    context.fillText(`p95 ${formatNumber(snapshot?.p95FrameMs, 1)} ms`, 26, 90);
    context.fillText(`draw ${formatNumber(renderer.calls, 0)}`, 26, 124);
    context.fillText(getAssetMetricLabel(asset), 26, 158);
    context.fillText(getMemoryLabel(snapshot, asset), 26, 192);
}

function readViewerPose({ renderer, camera, frame, referenceSpace }) {
    try {
        const transform = frame?.getViewerPose?.(referenceSpace)?.transform;
        if (transform?.position && transform?.orientation) {
            _viewerPosition.set(
                transform.position.x,
                transform.position.y,
                transform.position.z
            );
            _viewerQuaternion.set(
                transform.orientation.x,
                transform.orientation.y,
                transform.orientation.z,
                transform.orientation.w
            );
            return true;
        }
    } catch {
        // Fall through to Three's XR camera fallback.
    }

    try {
        const xrCamera = renderer?.xr?.isPresenting ? renderer.xr.getCamera(camera) : camera;
        if (!xrCamera) return false;
        xrCamera.updateMatrixWorld?.(true);
        xrCamera.getWorldPosition(_viewerPosition);
        xrCamera.getWorldQuaternion(_viewerQuaternion);
        return true;
    } catch {
        return false;
    }
}

export function createArMetricsHud3d({
    enabled = false,
    getSnapshot,
    updateIntervalMs = 500,
} = {}) {
    if (!enabled || typeof document === "undefined") {
        return {
            enabled: false,
            update: () => {},
            detach: () => {},
            dispose: () => {},
        };
    }

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 224;

    const context = canvas.getContext("2d", { alpha: false });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: false,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
    });

    const hudObject = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    hudObject.name = "HERA AR Metrics HUD";
    hudObject.frustumCulled = false;
    hudObject.renderOrder = 100000;
    hudObject.userData.heraMetricsHud = true;

    let attachedScene = null;
    let lastUpdateAt = -Infinity;

    function attachToScene(scene) {
        if (!scene || attachedScene === scene) return;
        detach();
        attachedScene = scene;
        scene.add(hudObject);
    }

    function detach() {
        if (hudObject.parent) {
            hudObject.parent.remove(hudObject);
        }
        attachedScene = null;
    }

    function updateTexture(time) {
        const currentTime = Number.isFinite(Number(time)) ? Number(time) : performance.now();
        if (currentTime - lastUpdateAt < updateIntervalMs) return;

        lastUpdateAt = currentTime;
        drawHud(canvas, context, getSnapshot?.());
        texture.needsUpdate = true;
    }

    function updateTransform({ scene, renderer, camera, frame, referenceSpace }) {
        if (!readViewerPose({ renderer, camera, frame, referenceSpace })) return;

        _forward.set(0, 0, -1).applyQuaternion(_viewerQuaternion);
        _up.set(0, 1, 0).applyQuaternion(_viewerQuaternion);

        _hudWorldPosition
            .copy(_viewerPosition)
            .addScaledVector(_forward, 1.05)
            .addScaledVector(_up, 0.22);

        _worldMatrix.compose(_hudWorldPosition, _viewerQuaternion, _hudScale);

        scene.updateMatrixWorld?.(true);
        _parentInverse.copy(scene.matrixWorld).invert();
        _localMatrix.multiplyMatrices(_parentInverse, _worldMatrix);
        _localMatrix.decompose(hudObject.position, hudObject.quaternion, hudObject.scale);
    }

    function update({ scene, renderer, camera, frame, referenceSpace, time } = {}) {
        if (!renderer?.xr?.isPresenting || !scene || !camera) {
            detach();
            return;
        }

        attachToScene(scene);
        updateTransform({ scene, renderer, camera, frame, referenceSpace });
        updateTexture(time);
    }

    function dispose() {
        detach();
        hudObject.geometry.dispose();
        material.dispose();
        texture.dispose();
    }

    drawHud(canvas, context, null);
    texture.needsUpdate = true;

    return {
        enabled: true,
        update,
        detach,
        dispose,
    };
}
