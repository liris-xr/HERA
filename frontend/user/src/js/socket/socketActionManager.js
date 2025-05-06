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

        console.log(asset.mesh)

        const index = this.arSessionManager.outlinePass.selectedObjects.indexOf(asset.mesh)

        if(index !== -1)
            this.arSessionManager.outlinePass.selectedObjects.splice(index, 1)
        else
            this.arSessionManager.outlinePass.selectedObjects.push(asset.mesh);

        console.log(index, this.arSessionManager.outlinePass.selectedObjects);
        return;


        asset.highlight.value = data.value

        asset.mesh.traverse((child) => {

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

        asset.hidden.value = data.value
        asset.mesh.visible = !asset.hidden.value
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
            const anim = THREE.AnimationClip.findByName(asset.mesh.animations, data.value)

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


}

