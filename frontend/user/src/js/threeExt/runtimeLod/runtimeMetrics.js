//calcule les métriques runtime, pour le moment une seule simple : cameraDistance

import * as THREE from "three";

const _assetWorldPos = new THREE.Vector3();

export function buildAssetRuntimeMetrics(asset, camera) {
    if (!asset?.object || !camera) {
        return {
            cameraDistance: Infinity,
        };
    }

    asset.object.getWorldPosition(_assetWorldPos);

    return {
        cameraDistance: camera.position.distanceTo(_assetWorldPos),
    };
}