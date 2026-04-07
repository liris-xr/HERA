import * as THREE from "three";


// Reusable objects to avoid allocations at runtime
const _box = new THREE.Box3(); //bounding box of the asset
const _size = new THREE.Vector3(); //its size
const _center = new THREE.Vector3(); //center of bounding box
const _centerCamera = new THREE.Vector3();
const _cornerCamera = new THREE.Vector3();
const _corners = Array.from({ length: 8 }, () => new THREE.Vector3()); //8 corners of bbox
const _ndc = new THREE.Vector3(); //normalized device coords (projection)
const _viewport = new THREE.Vector2();

function fillBoxCorners(box, corners) {
    const min = box.min;
    const max = box.max;

    corners[0].set(min.x, min.y, min.z);
    corners[1].set(max.x, min.y, min.z);
    corners[2].set(min.x, max.y, min.z);
    corners[3].set(max.x, max.y, min.z);
    corners[4].set(min.x, min.y, max.z);
    corners[5].set(max.x, min.y, max.z);
    corners[6].set(min.x, max.y, max.z);
    corners[7].set(max.x, max.y, max.z);
}

export function buildAssetRuntimeMetrics(asset, camera, renderer = null) {
    if (!asset?.object || !camera || !renderer) {
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
            frontCornerCount: 0,
            behindCornerCount: 0,
        };
    }
    //make sure matrices are up to date
    asset.object.updateWorldMatrix(true, true);
    camera.updateWorldMatrix(true, false);
    //calcul world space bounding box of the asset
    _box.setFromObject(asset.object);

    //skipping if object has no geometry
    if (_box.isEmpty()) {
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
            frontCornerCount: 0,
            behindCornerCount: 0,
        };
    }
    //getting bounding box center & size
    _box.getCenter(_center);
    _box.getSize(_size);
    //transform center into camera space to compute depth
    _centerCamera.copy(_center).applyMatrix4(camera.matrixWorldInverse);
    const cameraDepth = Math.max(-_centerCamera.z, 0.0001);

    fillBoxCorners(_box, _corners);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    //for debugging
    let frontCornerCount = 0;
    let behindCornerCount = 0;
    let validProjectedCount = 0;

    //projecting each corner to screen space
    for (const corner of _corners) {
        //passer du monde au repere caméra
        _cornerCamera.copy(corner).applyMatrix4(camera.matrixWorldInverse);

        // three.js: devant la caméra => z négatif
        if (_cornerCamera.z < 0) {
            frontCornerCount++;
        } else {
            behindCornerCount++;
            continue; // on ignore les coins derrière la caméra
        }
        //projecting corner to NDC space -1,1
        //passer de repere caméra à l'écran
        _ndc.copy(corner).project(camera);

        if (!Number.isFinite(_ndc.x) || !Number.isFinite(_ndc.y) || !Number.isFinite(_ndc.z)) {
            continue;
        }

        validProjectedCount++;
        //rectangle contient obj projeté
        minX = Math.min(minX, _ndc.x);
        maxX = Math.max(maxX, _ndc.x);
        minY = Math.min(minY, _ndc.y);
        maxY = Math.max(maxY, _ndc.y);
    }

    if (validProjectedCount === 0) {
        return {
            cameraDepth,
            rawWidthRatio: 0,
            rawHeightRatio: 0,
            rawCoverage: 0,
            visibleWidthRatio: 0,
            visibleHeightRatio: 0,
            visibleCoverage: 0,
            screenWidthPx: 0,
            screenHeightPx: 0,
            bboxSize: { x: _size.x, y: _size.y, z: _size.z },
            frontCornerCount,
            behindCornerCount,
        };
    }

    // Couverture brute (peut dépasser l'écran)
    //combien de l'écran ça repreésente car ecran entier fait 2 de -1 a 1 donc on calcule ratio
    const rawWidthRatio = Math.max((maxX - minX) / 2, 0);
    const rawHeightRatio = Math.max((maxY - minY) / 2, 0);
    const rawCoverage = Math.max(rawWidthRatio, rawHeightRatio);

    // Couverture visible dans l'écran seulement -- clamping coverage only visible part so we restrict values to screen bounds -1,1
    const clampedMinX = Math.max(minX, -1);
    const clampedMaxX = Math.min(maxX, 1);
    const clampedMinY = Math.max(minY, -1);
    const clampedMaxY = Math.min(maxY, 1);

    const visibleWidthRatio = Math.max((clampedMaxX - clampedMinX) / 2, 0);
    const visibleHeightRatio = Math.max((clampedMaxY - clampedMinY) / 2, 0);
    const visibleCoverage = Math.max(visibleWidthRatio, visibleHeightRatio);

    //convert ratios to actual pixel size on screen
    renderer.getSize(_viewport);
    const viewportWidth = Math.max(_viewport.x, 1);
    const viewportHeight = Math.max(_viewport.y, 1);

    const screenWidthPx = visibleWidthRatio * viewportWidth;
    const screenHeightPx = visibleHeightRatio * viewportHeight;

    return {
        cameraDepth,
        rawWidthRatio, //size in NDC
        rawHeightRatio,
        rawCoverage,  //max of width/height taille totale projetée mm hors écran

        visibleWidthRatio,
        visibleHeightRatio,
        visibleCoverage, //what user really sees
        screenWidthPx,
        screenHeightPx,
        bboxSize: { x: _size.x, y: _size.y, z: _size.z }, //world space size
        frontCornerCount,
        behindCornerCount,
    };
}