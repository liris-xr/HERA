import * as THREE from "three";

const _assetWorldPos = new THREE.Vector3();
const _sphere = new THREE.Sphere();

export function buildAssetRuntimeMetrics(asset, camera) {
    if (!asset?.object || !camera) {
        return {
            cameraDistance: Infinity,
            boundingRadius: 1,
            normalizedDistance: Infinity,
        };
    }

    asset.object.getWorldPosition(_assetWorldPos);

    const cameraDistance = camera.position.distanceTo(_assetWorldPos);

    const box = new THREE.Box3().setFromObject(asset.object);
    box.getBoundingSphere(_sphere);

    const boundingRadius = Math.max(_sphere.radius, 0.0001);
    const normalizedDistance = cameraDistance / boundingRadius;

    return {
        cameraDistance,
        boundingRadius,
        normalizedDistance,
    };
}