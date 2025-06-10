import * as THREE from "three";
import {OutlinePass} from "three/addons";
import {isRef, toRaw, unref} from "vue";

export class SocketActionManager {

    arSessionManager

    constructor(arSessionManager) {
        this.arSessionManager = arSessionManager;
    }

    highlight(data) {

        const scene = data.sceneId ? toRaw(this.arSessionManager.sceneManager.scenes.find(s => s.id === data.sceneId)) : this.arSessionManager.sceneManager.active

        const asset = scene.findAssetById(data.assetId)

        if(!asset) return

        asset.highlight.value = data.value

        asset.object.traverse((child) => {

            if(child.isMesh && child.material) {
                if(!child.oldMaterial)
                    child.oldMaterial = child.material


                if(asset.highlight.value) {
                    const material = child.material.clone()
                    material.roughness = 1
                    material.metalness = 1
                    material.emissive.set(0.3, 0.3, 0.2)
                    child.material = material // new THREE.MeshStandardMaterial({ color: 0xff0000 })
                } else
                    child.material = child.oldMaterial
            }

        })
    }

    toggleAsset(data) {
        const scene = data.sceneId ? toRaw(this.arSessionManager.sceneManager.scenes.find(s => s.id === data.sceneId)) : this.arSessionManager.sceneManager.active
        const asset = scene.findAssetById(data.assetId)

        if(!asset) return

        asset.hidden.value = !data.value
        asset.object.visible = !asset.hidden.value
    }

    scene(data) {

        this.arSessionManager.sceneManager.activeSceneId = data.sceneId

    }

    setActiveAnimation(data) {
        const scene = data.sceneId ? toRaw(this.arSessionManager.sceneManager.scenes.find(s => s.id === data.sceneId)) : this.arSessionManager.sceneManager.active
        const asset = scene.findAssetById(data.assetId)

        if(!asset) return

        asset.playAnimation(data.value)
    }

    toggleLabel(data) {
        const scene = data.sceneId ? toRaw(this.arSessionManager.sceneManager.scenes.find(s => s.id === data.sceneId)) : this.arSessionManager.sceneManager.active
        const label = scene.labelPlayer.findLabelById(data.labelId)

        if(!label) return

        label.setHidden(!data.value)
    }

    reset() {
        for(let sceneProxy of this.arSessionManager.sceneManager.getScenes()) {
            const scene = toRaw(sceneProxy)
            for(const asset of scene.getAssets()) {
                this.highlight({sceneId: scene.id, assetId: asset.id, value: false})
                this.toggleAsset({sceneId: scene.id, assetId: asset.id, value: true})
                this.setActiveAnimation({sceneId: scene.id, assetId: asset.id, value: null})
            }

            for(const label of scene.labelPlayer.getLabels()) {
                this.toggleLabel({sceneId: scene.id, labelId: label.id, value: true})
            }
        }
        this.arSessionManager.sceneManager.activeSceneId = this.arSessionManager.sceneManager.scenes[0].sceneId
    }

    hideAll(data) {
        const scene = data?.sceneId ? toRaw(this.arSessionManager.sceneManager.scenes.find(s => s.id === data.sceneId)) : this.arSessionManager.sceneManager.active

        for(const asset of scene.getAssets())
            this.toggleAsset({assetId: asset.id, value: false})

        for(const label of scene.labelPlayer.getLabels())
            this.toggleLabel({labelId: label.id, value: false})
    }

    showAll(data) {
        const scene = data?.sceneId ? toRaw(this.arSessionManager.sceneManager.scenes.find(s => s.id === data.sceneId)) : this.arSessionManager.sceneManager.active

        for(const asset of scene.getAssets())
            this.toggleAsset({assetId: asset.id, value: true})

        for(const label of scene.labelPlayer.getLabels())
            this.toggleLabel({labelId: label.id, value: true})
    }


}

