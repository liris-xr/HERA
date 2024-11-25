import * as THREE from "three";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import {classes} from "@/js/utils/extender.js";

export class GridPlane extends classes(THREE.Group, SceneElementInterface){

    constructor(gridSize = 4) {
        super();

        const minGridSize = 4;
        const tileSize = .5;
        const triangleWidth = .4
        const triangleOffset = .1
        const centerSize = .1;
        const colorCenterLine = new THREE.Color(0x223A50);
        const colorGrid = new THREE.Color(0x6E7D8B);

        if(gridSize < minGridSize) gridSize = minGridSize;


        let center = new THREE.Vector3();
        const gridGeometry = new THREE.PlaneGeometry(gridSize, gridSize).rotateX( -Math.PI / 2 );

        const shadowMaterial = new THREE.ShadowMaterial({opacity:0.3});
        const occlusionMaterial = new THREE.MeshBasicMaterial({colorWrite: false});

        let occlusionPlane = new THREE.Mesh(gridGeometry.clone(),occlusionMaterial);
        occlusionPlane.renderOrder = -1;
        occlusionPlane.position.set(center.x, 0, center.z);

        let shadowPlane = new THREE.Mesh(gridGeometry.clone(),shadowMaterial);
        shadowPlane.position.set(center.x, 0, center.z);
        shadowPlane.receiveShadow = true;

        let gridHelper = new THREE.GridHelper( gridSize, gridSize/tileSize, colorCenterLine, colorGrid );



        const triangleMaterial = new THREE.MeshBasicMaterial({color: colorGrid , side: THREE.DoubleSide});

        //center square

        const centerGeometry = new THREE.PlaneGeometry(centerSize, centerSize).rotateX( -Math.PI / 2 ).rotateY( -Math.PI / 4 );
        const centerMesh = new THREE.Mesh(centerGeometry, triangleMaterial);
        centerMesh.position.set(0,0.0001,0)


        //player position triangle
        let triangleFirstPointZ = gridSize/2 + triangleOffset
        let v1 = new THREE.Vector3(0, 0, triangleFirstPointZ);
        let v2 = new THREE.Vector3(triangleWidth/2, 0, triangleFirstPointZ + triangleWidth/2);
        let v3 = new THREE.Vector3(-triangleWidth/2, 0, triangleFirstPointZ + triangleWidth/2);

        let triangleGeometry = new THREE.BufferGeometry().setFromPoints([v1, v2, v3]);
        triangleGeometry.computeVertexNormals();


        let meshTriangle = new THREE.Mesh(triangleGeometry, triangleMaterial);


        this.add(meshTriangle);
        this.add(centerMesh)
        this.add(shadowPlane);
        this.add(gridHelper);
        this.add(occlusionPlane);
    }
    
    pushToScene(scene){
        scene.add(this);
    }
}
