import * as THREE from "three";

export class VrController {
    vrSession
    referenceSpace
    sceneManager
    camera
    renderer

    rayCaster

    constructor(vrSession, referenceSpace, sceneManager, camera, renderer) {
        this.vrSession = vrSession;
        this.referenceSpace = referenceSpace;
        this.sceneManager = sceneManager;
        this.renderer = renderer;
        this.camera = camera

        this.rayCaster = new THREE.Raycaster(undefined, undefined)
        this.rayCaster.camera = camera
    }

    init() {

        this.addUI()

        this.vrSession.addEventListener("select", async (event) => {
            const pose = event.frame.getPose(event.inputSource.targetRaySpace, this.referenceSpace)
            if(!pose) return

            const origin = new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
            const direction = new THREE.Vector3().set(0, 0, -1).applyQuaternion(
                new THREE.Quaternion(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w)
            );

            console.log(origin)
            console.log("camera", this.camera.position)

            this.rayCaster.set(origin, direction)

            const scene = this.sceneManager.active.value

            const intersects = this.rayCaster.intersectObjects(scene.children, true);


            for(let obj of intersects.map(el => el.object)) {

                obj.material.transparent = true
                obj.material.opacity = 0.05
            }

            const arrow = new THREE.ArrowHelper( this.rayCaster.ray.direction, this.rayCaster.ray.origin, 1000, Math.random() * 0xffffff );
            scene.add( arrow );


        })

        this.vrSession.addEventListener("inputsourceschange", (event) => {
            let controllers = event.added
            console.log(controllers)
        })
    }

    addUI() {
        // Créer l'élément UI
        const uiGeometry = new THREE.PlaneGeometry(1, 0.5);
        const uiMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, depthTest: false });
        const uiElement = new THREE.Mesh(uiGeometry, uiMaterial);

        uiElement.renderOrder = 99999
        // Ajouter l'élément comme enfant de la caméra
        this.camera.add(uiElement);

        // Positionner l'UI devant la caméra, à une distance de -2
        uiElement.position.set(0, -1, -2); // En bas et devant la caméra

    }




}