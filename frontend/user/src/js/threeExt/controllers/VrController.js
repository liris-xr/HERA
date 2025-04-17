import * as THREE from "three";
import {FontLoader, TextGeometry} from "three/addons";

export class VrController {
    vrSession
    referenceSpace
    sceneManager
    camera
    renderer
    #uiContainer

    font

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

    async init() {
        if(!this.font)
           await new FontLoader().load("/viewer/public/fonts/three_font.json", (font) => this.font = font)

        //TODO: problème avec le mode gaze à régler
        this.addUI()

        this.vrSession.addEventListener("select", this.handleSelect.bind(this))

        this.vrSession.addEventListener("inputsourceschange", (event) => {
            let controllers = event.added
            console.log(controllers)
        })
    }

    handleSelect(event) {
        const pose = event.frame.getPose(event.inputSource.targetRaySpace, this.referenceSpace)
        if(!pose) return

        const origin = new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
        const direction = new THREE.Vector3().set(0, 0, -1).applyQuaternion(
            new THREE.Quaternion(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w)
        );

        this.rayCaster.set(origin, direction)

        const scene = this.sceneManager.active.value

        const intersects = this.rayCaster.intersectObjects(scene.children, true);

        for(let obj of intersects.map(el => el.object)) {
            if(obj.onClick)
                obj.onClick()
        }

        // const arrow = new THREE.ArrowHelper( this.rayCaster.ray.direction, this.rayCaster.ray.origin, 1000, Math.random() * 0xffffff )
        // scene.add( arrow )
    }

    showUI() {
        this.#uiContainer.visible = true
    }

    hideUI() {
        this.#uiContainer.visible = false
    }

    addUI() {
        // Créer l'élément UI

        const nextGeometry = new TextGeometry("next", {
            font: this.font,
            size: 1,
            height: 0.2
        })

        const prevGeometry = new TextGeometry("previous", {
            font: this.font,
            size: 1,
            height: 0.2
        })

        nextGeometry.center()
        prevGeometry.center()

        const uiMaterial = new THREE.MeshBasicMaterial({color: 0x0000ff, depthTest: false})
        const uiMaterial2 = new THREE.MeshBasicMaterial({color: 0xff0000, depthTest: false})

        const nextButton = new THREE.Mesh(nextGeometry, uiMaterial)
        nextButton.onClick = () => this.sceneManager.setNextActive()
        nextButton.position.set(1, 0, 0)

        const prevButton = new THREE.Mesh(prevGeometry, uiMaterial2)
        prevButton.onClick = () => this.sceneManager.setPreviousActive()
        prevButton.position.set(-1, 0, 0)

        const ui = new THREE.Group()
        ui.add(prevButton)
        ui.add(nextButton)

        ui.renderOrder = 99999

        this.#uiContainer = ui
        // Ajouter l'élément comme enfant de la caméra
        this.camera.add(ui)

        // Positionner l'UI devant la caméra, à une distance de -2
        ui.position.set(0, -1, -2) // En bas et devant la caméra

    }



    onSceneChanged() {

    }




}