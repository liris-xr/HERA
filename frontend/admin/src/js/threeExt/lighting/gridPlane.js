import * as THREE from "three";
import { SceneElementInterface } from "@/js/threeExt/interfaces/sceneElementInterface.js";
import { classes } from "@/js/utils/extender.js";

function safeFiniteNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

export class GridPlane extends classes(THREE.Group, SceneElementInterface) {
    constructor(gridSize = 4) {
        super();

        const minGridSize = 4;
        const tileSize = 0.5;
        const triangleWidth = 0.4;
        const triangleOffset = 0.1;
        const centerSize = 0.1;

        const colorCenterLine = new THREE.Color(0x223A50);
        const colorGrid = new THREE.Color(0x6E7D8B);

        gridSize = safeFiniteNumber(gridSize, minGridSize);

        if (gridSize < minGridSize) {
            gridSize = minGridSize;
        }

        const gridDivisions = Math.max(
            1,
            Math.floor(gridSize / tileSize)
        );

        const center = new THREE.Vector3();

        const gridGeometry = new THREE.PlaneGeometry(gridSize, gridSize)
            .rotateX(-Math.PI / 2);

        const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        const occlusionMaterial = new THREE.MeshBasicMaterial({
            colorWrite: false,
        });

        const occlusionPlane = new THREE.Mesh(
            gridGeometry.clone(),
            occlusionMaterial
        );
        occlusionPlane.renderOrder = -1;
        occlusionPlane.position.set(center.x, 0, center.z);

        const shadowPlane = new THREE.Mesh(
            gridGeometry.clone(),
            shadowMaterial
        );
        shadowPlane.position.set(center.x, 0, center.z);
        shadowPlane.receiveShadow = true;

        const gridHelper = new THREE.GridHelper(
            gridSize,
            gridDivisions,
            colorCenterLine,
            colorGrid
        );

        const triangleMaterial = new THREE.MeshBasicMaterial({
            color: colorGrid,
            side: THREE.DoubleSide,
        });

        const centerGeometry = new THREE.PlaneGeometry(centerSize, centerSize)
            .rotateX(-Math.PI / 2)
            .rotateY(-Math.PI / 4);

        const centerMesh = new THREE.Mesh(centerGeometry, triangleMaterial);
        centerMesh.position.set(0, 0.0001, 0);

        const triangleFirstPointZ = gridSize / 2 + triangleOffset;

        const triangleShape = new THREE.Shape();
        triangleShape.moveTo(0, triangleFirstPointZ);
        triangleShape.lineTo(triangleWidth / 2, triangleFirstPointZ + triangleWidth / 2);
        triangleShape.lineTo(-triangleWidth / 2, triangleFirstPointZ + triangleWidth / 2);
        triangleShape.lineTo(0, triangleFirstPointZ);

        const triangleGeometry = new THREE.ShapeGeometry(triangleShape)
            .rotateX(-Math.PI / 2);

        triangleGeometry.computeVertexNormals();

        const meshTriangle = new THREE.Mesh(
            triangleGeometry,
            triangleMaterial
        );

        this.add(meshTriangle);
        this.add(centerMesh);
        this.add(shadowPlane);
        this.add(gridHelper);
        this.add(occlusionPlane);
    }

    pushToScene(scene) {
        scene.add(this);
    }
}