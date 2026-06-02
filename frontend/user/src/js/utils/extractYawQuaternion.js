import * as THREE from "three";

export function extractYawQuaternion(q) {
    // Convert quaternion to direction vector (Z forward)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);

    // Projeter sur le plan horizontal (XZ)
    forward.y = 0;
    forward.normalize();

    // yaw quaternion
    const yawQuat = new THREE.Quaternion();
    yawQuat.setFromUnitVectors(new THREE.Vector3(0, 0, -1), forward);

    return yawQuat;
}