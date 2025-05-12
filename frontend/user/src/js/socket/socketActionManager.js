import * as THREE from "three";
import {OutlinePass} from "three/addons";
import {isRef, unref} from "vue";

export class SocketActionManager {

    arSessionManager

    constructor(arSessionManager) {
        this.arSessionManager = arSessionManager;
    }

    highlight(data) {

        const scene = this.arSessionManager.sceneManager.active

        const asset = scene.findAssetById(data.assetId)

        if(!asset) return

        asset.highlight.value = data.value

        asset.object.traverse((child) => {

            if(child.isMesh && child.material) {
                if(!child.oldMaterial)
                    child.oldMaterial = child.material

                if(asset.highlight.value) {
                    child.material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
                } else
                    child.material = child.oldMaterial
            }

        })
    }

    toggleAsset(data) {
        const scene = this.arSessionManager.sceneManager.active
        const asset = scene.findAssetById(data.assetId)

        if(!asset) return

        asset.hidden.value = !data.value
        asset.object.visible = !asset.hidden.value
    }

    scene(data) {

        this.arSessionManager.sceneManager.activeSceneId = data.sceneId

    }

    setActiveAnimation(data) {
        const scene = this.arSessionManager.sceneManager.active
        const asset = scene.findAssetById(data.assetId)

        if(!asset) return

        if(asset.playingAction) {
            asset.playingAction.stop()
            asset.playingAction = null
            asset.activeAnimation = null
        }

        if(data.value) {
            const anim = THREE.AnimationClip.findByName(asset.object.animations, data.value)

            if(!anim) return

            const action = asset.animationMixer.clipAction(anim)
            action.play()
            asset.activeAnimation = data.value

            asset.playingAction = action

        }
    }

    toggleLabel(data) {
        const scene = this.arSessionManager.sceneManager.active
        const label = scene.labelPlayer.findLabelById(data.labelId)

        if(!label) return

        label.setHidden(!data.value)
    }

    reset() {
        const scene = this.arSessionManager.sceneManager.active

        for(const asset of scene.getAssets()) {
            this.highlight({assetId: asset.id, value: false})
            this.toggleAsset({assetId: asset.id, value: true})
        }

        for(const label of scene.labelPlayer.getLabels()) {
            this.toggleLabel({labelId: label.id, value: true})
        }
    }

    hideAll() {
        const scene = this.arSessionManager.sceneManager.active

        for(const asset of scene.getAssets())
            this.toggleAsset({assetId: asset.id, value: false})

        for(const label of scene.labelPlayer.getLabels())
            this.toggleLabel({labelId: label.id, value: false})
    }

    showAll() {
        const scene = this.arSessionManager.sceneManager.active

        for(const asset of scene.getAssets())
            this.toggleAsset({assetId: asset.id, value: true})

        for(const label of scene.labelPlayer.getLabels())
            this.toggleLabel({labelId: label.id, value: true})
    }


}

