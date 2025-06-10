import * as ThreeMeshUI from "three-mesh-ui"
import * as THREE from "three"
import {watch} from "vue";
import {ArMeshLoadError} from "@/js/threeExt/error/arMeshLoadError.js";
import {createButton} from "@/js/threeExt/ui/utils.js";
import {generateUUID} from "three/src/math/MathUtils.js";
import {ScenePlacementManager} from "@/js/threeExt/scene/scenePlacementManager.js";

const COYOTE_TIME = 150; // en ms, délai pendant lequel un bouton reste pressable pour compenser les tremblements

export class Xr3dUi {

    renderer
    camera
    xrSession
    sceneManager
    referenceSpace
    recalibrate
    xrMode

    rayCaster
    hittables

    container
    animationContainer
    playText
    sceneText
    notificationsContainer
    pointers
    scene

    lastHittable

    needsForceVisibility

    constructor(renderer, camera, xrSession, sceneManager, referenceSpace, recalibrate, xrMode) {
        this.renderer = renderer
        this.camera = camera
        this.xrSession = xrSession
        this.sceneManager = sceneManager
        this.referenceSpace = referenceSpace
        this.recalibrate = recalibrate
        this.xrMode = xrMode

        this.hittables = []
        this.pointers = []
        this.lastHittable = {}
        this.needsForceVisibility = false

        this.rayCaster = new THREE.Raycaster(undefined, undefined)
        this.rayCaster.camera = camera
    }

    init() {
        this.setupUI()
        this.initListeners()

        this.hide()
    }

    createPointer() {
        const pointer = new THREE.Mesh(
            new THREE.SphereGeometry(0.01, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })
        )
        pointer.name = "pointer" + generateUUID()

        pointer.renderOrder = 999
        pointer.material.depthTest = false
        pointer.visible = true

        this.pointers.push(pointer)

        if(this.sceneManager.active.value)
            this.sceneManager.active.value.add(pointer)

        pointer.visible = this.container?.visible

        return pointer
    }

    removePointer(pointer) {
        const index = this.pointers.indexOf(pointer)
        if(index !== -1)
            this.pointers.splice(index, 1)

        if(this.sceneManager.active.value)
            this.sceneManager.active.value.remove(pointer)
    }

    initListeners() {
        this.xrSession.addEventListener("select", this.handleSelect.bind(this))
        this.xrSession.addEventListener("inputsourcechange", this.handleInputSourceChange.bind(this))

        watch(this.sceneManager.active, () => {
            this.sceneText.set({ content: this.sceneManager.active.value.title })
            this.clearNotifications()

            if(this.sceneManager.active.value.hasDescription())
                this.createNotification({message: this.sceneManager.active.value.description})

            this.animationContainer.visible = this.sceneManager.active.value.hasAnimation.value
            this.updateAnimationText()
        })

    }

    setupUI() {
        const container = new ThreeMeshUI.Block({
            contentDirection: 'column',
            fontFamily: '/viewer/public/fonts/Inter-variable-msdf.json',
            fontTexture: '/viewer/public/fonts/Inter-variable.png',
            font: 0.07,
            padding: 0.02,
            borderRadius: 0.11,
            backgroundColor: new THREE.Color(0x222222)
        })

        container.name = "UI"

        this.animationContainer = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'row-reverse',
            fontFamily: '/viewer/public/fonts/Inter-variable-msdf.json',
            fontTexture: '/viewer/public/fonts/Inter-variable.png',
            fontSize: 0.07,
            padding: 0.02,
            margin: 0.02,
            borderRadius: 0.11,
            backgroundColor: new THREE.Color(0x555555)
        } );

        this.playText = new ThreeMeshUI.Text( { content: "Play" } )
        const buttonPlay = createButton(this.playText)
        const buttonReset = createButton("Reset")
        this.hittables.push(buttonPlay, buttonReset)

        buttonPlay.onClick = () => {
            this.sceneManager.active.value.labelPlayer.togglePlaying()
            this.updateAnimationText()
        }

        buttonReset.onClick = () => {
            this.sceneManager.active.value.labelPlayer.reset()
            this.updateAnimationText()
        }

        this.animationContainer.add( buttonPlay, buttonReset );

        this.animationContainer.visible = false


        const sceneContainer = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'row-reverse',
            fontFamily: '/viewer/public/fonts/Inter-variable-msdf.json',
            fontTexture: '/viewer/public/fonts/Inter-variable.png',
            fontSize: 0.07,
            padding: 0.02,
            margin: 0.02,
            borderRadius: 0.11,
            backgroundColor: new THREE.Color(0x555555)
        } );

        const buttonPrevious = createButton("previous")
        const buttonNext = createButton("next")
        this.hittables.push(buttonNext, buttonPrevious)

        this.sceneText = new ThreeMeshUI.Text( { content: this.sceneManager.active.value.title } )
        const buttonSelect = createButton(this.sceneText, {width: 0.6})

        buttonPrevious.onClick = () => {
            this.sceneManager.setPreviousActive()
        }
        buttonNext.onClick = () => {
            this.sceneManager.setNextActive()
        }

        const vrActionsContainer = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'row-reverse',
            fontFamily: '/viewer/public/fonts/Inter-variable-msdf.json',
            fontTexture: '/viewer/public/fonts/Inter-variable.png',
            fontSize: 0.07,
            padding: 0.02,
            margin: 0.02,
            borderRadius: 0.11,
            backgroundColor: new THREE.Color(0x555555)
        } );

        const buttonRecalibrate = createButton("Recalibrate", {width: 0.5})
        vrActionsContainer.add(buttonRecalibrate)
        this.hittables.push(buttonRecalibrate)

        buttonRecalibrate.onClick = () => {
            if(this.xrMode === "vr")
                this.recalibrate()
            else
                this.sceneManager.scenePlacementManager.reset()
        }

        this.notificationsContainer = new ThreeMeshUI.Block( {
            justifyContent: 'space-evenly',
            contentDirection: 'column',
            fontFamily: '/viewer/public/fonts/Inter-variable-msdf.json',
            fontTexture: '/viewer/public/fonts/Inter-variable.png',
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11,
            margin: 0.02,
            backgroundOpacity: 0,
        } );

        sceneContainer.add( buttonNext, buttonSelect, buttonPrevious );

        container.add(this.animationContainer, sceneContainer, vrActionsContainer, this.notificationsContainer)
        container.visible = false

        this.container = container

        this.needsForceVisibility = true

    }

    createNotification(data) {
        const message = data?.message

        const notification = new ThreeMeshUI.Block( {
            contentDirection: 'column-reverse',
            fontFamily: '/viewer/public/fonts/Inter-variable-msdf.json',
            fontTexture: '/viewer/public/fonts/Inter-variable.png',
            fontSize: 0.07,
            interLine: 0.01,
            padding: 0.05,
            borderRadius: 0.11,
            margin: 0.02,
            width: 1.6,
            bestFit: "shrink",
            textAlign: 'justify-left',
            height: Math.ceil(message.length / 50) * 0.09 + 0.4,
            backgroundColor: new THREE.Color(0x999999),
        })

        const hideButton = createButton("hide")
        this.hittables.push(hideButton)
        hideButton.onClick = () => {
            this.notificationsContainer.remove(notification)
            notification.visible = false

            this.container.traverse(child => {
                child?.updateLayout?.()
                child?.updateInner?.()
            })
            this.container.updateLayout()
            this.container.updateInner()

            const index = this.hittables.indexOf(hideButton)
            if(index !== -1)
                this.hittables.splice(index, 1)

        }

        const text = new ThreeMeshUI.Text( { content: message, wrapCount: 50 } )

        notification.add(
            hideButton,
            text,
        )



        this.notificationsContainer.add(notification)

        this.container.traverse(child => {
            child?.updateLayout?.()
            child?.updateInner?.()
        })
        this.container.updateLayout()
        this.container.updateInner()

        this.needsForceVisibility = true
    }

    clearNotifications() {
        for(let i of this.notificationsContainer.children) {
            this.notificationsContainer.remove(i)
            i.visible = false
        }
    }

    handleInputSourceChange(event) {
        const delta = event.added.length - event.removed.length

        if(delta > 0)
            for(let i = 0; i < delta; i++)
                this.createPointer()
        else if (delta < 0)
            for(let i = 0; i < Math.abs(delta); i++)
                this.removePointer(this.pointers[this.pointers.length - 1])
    }

    handleSelect(event) {
        if(!this.scene) return

        if(!this.container.visible)
            this.show()
        else
            !this.hitTest(event) && this.hide()

    }

    forceVisibility() {
        this.container.depthTest = false
        this.container.depthWrite = false
        this.container.transparent = true

        this.container.traverse(child => {
            if(child.material) {
                child.material.depthTest = false;
                child.material.depthWrite = false;
                child.material.transparent = true;
            }
        });
    }

    show() {

        this.updatePosition()

        this.needsForceVisibility = true
        this.container.visible = true
        for(let pointer of this.pointers)
            pointer.visible = true

    }

    hide() {
        this.container.visible = false
        for(let pointer of this.pointers)
            pointer.visible = false
    }

    updatePosition() {

        const distance = 2

        const direction = new THREE.Vector3()
        this.camera.getWorldDirection(direction)

        const newPos = new THREE.Vector3()
        newPos.copy(this.camera.position).add(direction.multiplyScalar(distance))

        this.container.position.copy(newPos)

        this.container.applyMatrix4(new THREE.Matrix4().copy(this.scene.matrixWorld).invert())
        this.container.lookAt(this.camera.position)
    }



    loop(frame) {
        ThreeMeshUI.update()
        this.hoverTest(frame)

        if(this.needsForceVisibility) {
            this.forceVisibility()
            this.needsForceVisibility = false
        }
    }

    addToScene(scene) {
        if(scene instanceof ScenePlacementManager)
            return

        scene.add(this.container)
        for(let pointer of this.pointers)
            scene.add(pointer)

        this.scene = scene
        this.needsForceVisibility = true
    }

    removeFromScene(scene) {
        scene.remove(this.container)
        for(let pointer of this.pointers)
            scene.remove(pointer)
    }

    updateAnimationText() {
        if(this.sceneManager.active.value.hasAnimation.value)
            this.playText.set({ content: this.sceneManager.active.value.labelPlayer.isPlaying.value ? "Pause" : "Play" })
        else
            this.playText.set({ content: "Play" })
    }

    getRaycastParams(pose) {
        const poseOrigin = new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
        const poseDirection = new THREE.Vector3().set(0, 0, -1).applyQuaternion(
            new THREE.Quaternion(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w)
        );

        const pointerPosition = poseOrigin.clone().add(poseDirection.clone().multiplyScalar(1));

        const origin = this.camera.position.clone()
        const direction = new THREE.Vector3().subVectors(pointerPosition, origin).normalize()

        return {origin, direction, pointerPosition}
    }

    hitTest(event) {

        const pose = event.frame.getPose(event.inputSource.targetRaySpace, this.referenceSpace)
        if(!pose) return

        const {origin, direction} = this.getRaycastParams(pose)

        this.rayCaster.set(origin, direction)

        for(let i of this.hittables) {
            if(this.rayCaster.intersectObject(i).length > 0) {
                i?.onClick?.()
                return true
            }
        }

        // COYOTE TIME
        const index = Array.from(this.xrSession.inputSources).indexOf(event.inputSource)
        if(index !== -1 && this.lastHittable[index]) {
            const lastHittable = this.lastHittable[index]
            if(Date.now() - lastHittable.time < COYOTE_TIME) {
                lastHittable.object.onClick?.()
                return true
            }

        }

        // const arrow = new THREE.ArrowHelper( this.rayCaster.ray.direction, this.rayCaster.ray.origin, 1000, Math.random() * 0xffffff )
        // this.sceneManager.active.value.add( arrow )

        return false

    }

    hoverTest(frame) {
        if (!frame) return;

        const hovered = []

        const inputSources = this.xrSession.inputSources;
        let count = 0;

        for (const inputSource of inputSources) {
            if (!inputSource.targetRaySpace) continue;

            const pose = frame.getPose(inputSource.targetRaySpace, this.referenceSpace);
            if (!pose) continue;

            let pointer
            if(this.pointers.length <= count)
                pointer = this.createPointer()
            else
                pointer = this.pointers[count]

            const {origin, direction, pointerPosition} = this.getRaycastParams(pose)

            pointer.position.copy(pointerPosition);

            const inverseMatrix = new THREE.Matrix4().copy(this.scene.matrixWorld).invert();
            pointer.applyMatrix4(inverseMatrix);

            this.rayCaster.set(origin, direction)

            for (const btn of this.hittables) {
                const intersections = this.rayCaster.intersectObject(btn, true);
                if (intersections.length > 0) {
                    btn.setState("hovered");
                    hovered.push(btn)
                    this.lastHittable[count] = {object: btn, time: Date.now()}
                    break
                } else {
                    if(!hovered.includes(btn))
                        btn.setState("idle");
                }
            }

            count++
        }
    }

}