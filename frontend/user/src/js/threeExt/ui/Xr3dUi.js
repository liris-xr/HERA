import * as ThreeMeshUI from "three-mesh-ui"
import * as THREE from "three"
import {watch} from "vue";
import {ArMeshLoadError} from "@/js/threeExt/error/arMeshLoadError.js";
import {createButton} from "@/js/threeExt/ui/utils.js";

export class Xr3dUi {

    renderer
    camera
    xrSession
    sceneManager
    referenceSpace

    rayCaster
    hittables

    container
    pointer
    sceneText
    notificationsContainer

    constructor(renderer, camera, xrSession, sceneManager, referenceSpace) {
        this.renderer = renderer
        this.camera = camera
        this.xrSession = xrSession
        this.sceneManager = sceneManager
        this.referenceSpace = referenceSpace
        this.hittables = []

        this.rayCaster = new THREE.Raycaster(undefined, undefined)
        this.rayCaster.camera = camera
    }

    init() {
        this.setupUI()
        this.initListeners()

        this.pointer = new THREE.Mesh(
            new THREE.SphereGeometry(0.01, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })
        )
        this.pointer.renderOrder = 999
        this.pointer.material.depthTest = false
        this.pointer.visible = true
    }

    initListeners() {
        this.xrSession.addEventListener("select", this.handleSelect.bind(this))

        watch(this.sceneManager.active, () => {
            this.sceneText.set({ content: this.sceneManager.active.value.title })

            if(this.sceneManager.active.value.hasDescription())
                this.createNotification({message: this.sceneManager.active.value.description})
        })

        watch(this.sceneManager.active.value.getErrors, (value) => {
            console.log(value)
            this.createNotification(value)
        })

        this.createNotification({message: "test"})

    }

    setupUI() {
        const container = new ThreeMeshUI.Block({
            contentDirection: 'column',
            fontFamily: '/viewer/public/fonts/Roboto-msdf.json',
            fontTexture: '/viewer/public/fonts/Roboto-msdf.png',
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11,
            backgroundColor: new THREE.Color(0x222222)
        })

        const sceneContainer = new ThreeMeshUI.Block( {
            justifyContent: 'center',
            contentDirection: 'row-reverse',
            fontFamily: '/viewer/public/fonts/Roboto-msdf.json',
            fontTexture: '/viewer/public/fonts/Roboto-msdf.png',
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11,
            backgroundColor: new THREE.Color(0x555555)
        } );

        container.position.set( 0, 0, -3 );

        // BUTTONS

        // We start by creating objects containing options that we will use with the two buttons,
        // in order to write less code.

        const buttonOptions = {
            width: 0.4,
            height: 0.15,
            justifyContent: 'center',
            offset: 0.05,
            margin: 0.02,
            borderRadius: 0.075
        };

        const selectOptions = {
            width: 0.6,
            height: 0.15,
            justifyContent: 'center',
            offset: 0.05,
            margin: 0.02,
            borderRadius: 0.075,
        };

        // Options for component.setupState().
        // It must contain a 'state' parameter, which you will refer to with component.setState( 'name-of-the-state' ).

        const hoveredStateAttributes = {
            state: 'hovered',
            attributes: {
                offset: 0.035,
                backgroundColor: new THREE.Color( 0x999999 ),
                backgroundOpacity: 1,
                fontColor: new THREE.Color( 0xffffff )
            },
        };

        const idleStateAttributes = {
            state: 'idle',
            attributes: {
                offset: 0.035,
                backgroundColor: new THREE.Color( 0x666666 ),
                backgroundOpacity: 0.3,
                fontColor: new THREE.Color( 0xffffff )
            },
        };

        // Buttons creation, with the options objects passed in parameters.

        const buttonNext = new ThreeMeshUI.Block( buttonOptions );
        const buttonPrevious = new ThreeMeshUI.Block( buttonOptions );
        this.hittables.push(buttonNext, buttonPrevious)

        const buttonSelect = new ThreeMeshUI.Block( selectOptions );

        buttonSelect.set({
            backgroundColor: new THREE.Color(0xBBBBBB)
        })

        // Add text to buttons

        buttonNext.add(
            new ThreeMeshUI.Text( { content: "next" } )
        )

        buttonPrevious.add(
            new ThreeMeshUI.Text( { content: "previous" } )
        )


        this.sceneText =   new ThreeMeshUI.Text( { content: this.sceneManager.active.value.title } )

        buttonSelect.add(
           this.sceneText
        )
        buttonNext.setupState( hoveredStateAttributes );
        buttonNext.setupState( idleStateAttributes );


        buttonPrevious.setupState( hoveredStateAttributes );
        buttonPrevious.setupState( idleStateAttributes );

        buttonSelect.setupState(idleStateAttributes)

        buttonPrevious.onClick = () => {
            this.sceneManager.setPreviousActive()
        }
        buttonNext.onClick = () => {
            this.sceneManager.setNextActive()
        }

        this.notificationsContainer = new ThreeMeshUI.Block( {
            justifyContent: 'space-evenly',
            contentDirection: 'column',
            fontFamily: '/viewer/public/fonts/Roboto-msdf.json',
            fontTexture: '/viewer/public/fonts/Roboto-msdf.png',
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11,
            backgroundColor: null
        } );

        sceneContainer.add( buttonNext, buttonSelect, buttonPrevious );

        container.add(sceneContainer, this.notificationsContainer)
        container.visible = false

        this.container = container

        this.forceVisibility()

    }

    createNotification(data) {
        const message = data?.message?.normalize("NFD")?.replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ']/g, " ")

        const notification = new ThreeMeshUI.Block( {
            contentDirection: 'column-reverse',
            fontFamily: '/viewer/public/fonts/Roboto-msdf.json',
            fontTexture: '/viewer/public/fonts/Roboto-msdf.png',
            fontSize: 0.07,
            padding: 0.05,
            borderRadius: 0.11,
            margin: 0.02,
            width: 1.6,
            bestFit: "shrink",
            textAlign: 'justify-left',
            height: Math.ceil(message.length / 50) * 0.12 + 0.3,
            backgroundColor: new THREE.Color(0x999999),
        })

        const hideButton = createButton("hide")
        this.hittables.push(hideButton)
        hideButton.onClick = () => {
            this.notificationsContainer.remove(notification)
            notification.visible = false
            this.notificationsContainer.updateLayout()
            this.container.updateLayout()
            this.container.traverse(child => {
                child?.updateLayout?.()
            })
        }

        const text = new ThreeMeshUI.Text( { content: message, wrapCount: 50 } )
        console.log(text)

        notification.add(
            hideButton,
            text,
        )

        this.notificationsContainer.add(notification)

        notification.updateLayout()
        this.notificationsContainer.updateLayout()
        this.container.updateLayout()

        this.forceVisibility()
    }

    handleSelect(event) {
        if(!this.container.visible)
            this.show()
        else {
            if(!this.hitTest(event))
                this.hide()
        }
    }

    forceVisibility() {
        this.container.traverse(child => {
            if(child.material) {
                child.material.depthTest = false;
                child.material.depthWrite = false;
                child.material.transparent = true;
            }
        });
    }

    show() {
        const distance = 1

        const direction = new THREE.Vector3()
        this.camera.getWorldDirection(direction)

        const newPos = new THREE.Vector3()
        newPos.copy(this.camera.position).add(direction.multiplyScalar(distance))

        this.container.position.copy(newPos)
        this.container.lookAt(this.camera.position)

        this.forceVisibility()
        this.container.visible = true

    }

    hide() {
        this.container.visible = false
    }

    loop(frame) {
        ThreeMeshUI.update()
        this.hoverTest(frame)
    }

    addToScene(scene) {
        scene.add(this.container)
        scene.add(this.pointer)

        this.forceVisibility()
    }

    hitTest(event) {

        const pose = event.frame.getPose(event.inputSource.targetRaySpace, this.referenceSpace)
        if(!pose) return

        const origin = new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
        const direction = new THREE.Vector3().set(0, 0, -1).applyQuaternion(
            new THREE.Quaternion(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w)
        );

        this.rayCaster.set(origin, direction)

        for(let i of this.hittables) {
            if(this.rayCaster.intersectObject(i).length > 0) {
                i?.onClick?.()
                return true
            }
        }

        // const arrow = new THREE.ArrowHelper( this.rayCaster.ray.direction, this.rayCaster.ray.origin, 1000, Math.random() * 0xffffff )
        // this.sceneManager.active.value.add( arrow )

        return false

    }

    hoverTest(frame) {
        if (!frame) return;

        const inputSources = this.xrSession.inputSources;

        for (const inputSource of inputSources) {
            if (!inputSource.targetRaySpace) continue;

            const pose = frame.getPose(inputSource.targetRaySpace, this.referenceSpace);
            if (!pose) continue;

            const origin = new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
            const direction = new THREE.Vector3().set(0, 0, -1).applyQuaternion(
                new THREE.Quaternion(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w)
            );

            this.rayCaster.set(origin, direction)

            const pointerPos = origin.clone().add(direction.clone().multiplyScalar(1));
            this.pointer.position.copy(pointerPos);
            this.pointer.visible = true;

            let hovered = false;
            for (const btn of this.hittables) {
                const intersections = this.rayCaster.intersectObject(btn, true);
                if (intersections.length > 0) {
                    btn.setState("hovered");
                    hovered = true;
                } else {
                    btn.setState("idle");
                }
            }

            if (hovered) break;
        }
    }

}