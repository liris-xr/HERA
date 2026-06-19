import * as THREE from "three";

export function isFiniteVector3(value) {
    return Boolean(
        value &&
        Number.isFinite(value.x) &&
        Number.isFinite(value.y) &&
        Number.isFinite(value.z)
    );
}

export function isFiniteBox3(box) {
    return Boolean(
        box &&
        !box.isEmpty?.() &&
        isFiniteVector3(box.min) &&
        isFiniteVector3(box.max)
    );
}

export function getObjectBoundingBox(object, { preferCustom = true, applyMatrixWorld = true } = {}) {
    if (!object) {
        return {
            box: null,
            valid: false,
            source: "missing",
            empty: true,
        };
    }

    object.updateMatrixWorld?.(true);

    let box = null;
    let source = "setFromObject";
    let needsWorldMatrix = false;

    if (preferCustom && typeof object.getBoundingBox === "function") {
        try {
            box = object.getBoundingBox()?.clone?.() ?? null;
            source = "getBoundingBox";
            needsWorldMatrix = true;
        } catch (error) {
            return {
                box: null,
                valid: false,
                source,
                empty: true,
                error: error?.message ?? String(error),
            };
        }
    }

    if (!box) {
        box = new THREE.Box3().setFromObject(object);
        needsWorldMatrix = false;
    }

    if (applyMatrixWorld && needsWorldMatrix && object.matrixWorld) {
        box.applyMatrix4(object.matrixWorld);
    }

    return {
        box,
        valid: isFiniteBox3(box),
        source,
        empty: box?.isEmpty?.() ?? true,
    };
}

export function snapshotVector3(value) {
    if (!value) return null;
    return {
        x: Number.isFinite(value.x) ? Number(value.x.toFixed(4)) : null,
        y: Number.isFinite(value.y) ? Number(value.y.toFixed(4)) : null,
        z: Number.isFinite(value.z) ? Number(value.z.toFixed(4)) : null,
    };
}

export function snapshotEuler(value) {
    if (!value) return null;
    return {
        x: Number.isFinite(value.x) ? Number(value.x.toFixed(4)) : null,
        y: Number.isFinite(value.y) ? Number(value.y.toFixed(4)) : null,
        z: Number.isFinite(value.z) ? Number(value.z.toFixed(4)) : null,
        order: value.order ?? null,
    };
}

export function snapshotTransform(object) {
    if (!object) return null;
    const worldPosition = new THREE.Vector3();
    object.getWorldPosition?.(worldPosition);

    return {
        type: object.type ?? null,
        name: object.name ?? null,
        position: snapshotVector3(object.position),
        rotation: snapshotEuler(object.rotation),
        scale: snapshotVector3(object.scale),
        worldPosition: snapshotVector3(worldPosition),
    };
}

export function snapshotBox3(box) {
    if (!box) return null;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    if (!isFiniteBox3(box)) {
        return {
            valid: false,
            empty: box.isEmpty?.() ?? true,
            min: snapshotVector3(box.min),
            max: snapshotVector3(box.max),
            size: null,
            center: null,
        };
    }

    box.getSize(size);
    box.getCenter(center);

    return {
        valid: true,
        empty: false,
        min: snapshotVector3(box.min),
        max: snapshotVector3(box.max),
        size: snapshotVector3(size),
        center: snapshotVector3(center),
    };
}
