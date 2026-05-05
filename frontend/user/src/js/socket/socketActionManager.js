import * as THREE from "three";
import {OutlinePass} from "three/addons";
import {toRaw} from "vue";

export class SocketActionManager {

    arSessionManager

    constructor(arSessionManager) {
        this.arSessionManager = arSessionManager;
    }

    getScene(sceneId = null) {
        if (sceneId) {
            return toRaw(
                this.arSessionManager.sceneManager.scenes.find(
                    (s) => String(s.sceneId) === String(sceneId)
                )
            );
        }

        return toRaw(this.arSessionManager.sceneManager.getActiveContentScene());
    }

    highlight(data) {

        const scene = this.getScene(data.sceneId);
        if (!scene) return;

        const asset = scene.findAssetById(data.assetId)

        if(!asset) return

        asset.highlight.value = data.value
        if (!asset.object) return;

        asset.object.traverse((child) => {

            if(child.isMesh && child.material) {
                if(!child.oldMaterial)
                    child.oldMaterial = child.material


                if(asset.highlight.value) {
                    const material = child.material.clone()
                    material.roughness = 1
                    material.metalness = 1
                    material.emissive.set(0.3, 0.3, 0.0)
                    child.material = material // new THREE.MeshStandardMaterial({ color: 0xff0000 })
                } else
                    child.material = child.oldMaterial
            }

        })
    }

    toggleAsset(data) {
        const scene = this.getScene(data.sceneId);
        if (!scene) return;
        const asset = scene.findAssetById(data.assetId)

        if(!asset) return

        asset.hidden.value = !data.value
        if (asset.object) {
            asset.object.visible = !asset.hidden.value
        }
    }

    async scene(data) {
        try {
            await this.arSessionManager.sceneManager.setActiveById(data.sceneId);
        } catch (e) {
            console.error("[SocketActionManager] unable to switch scene", e);
        }
    }

    setActiveAnimation(data) {
        const scene = this.getScene(data.sceneId);
        if (!scene) return;
        const asset = scene.findAssetById(data.assetId)

        if(!asset) return

        asset.playAnimation(data.value)
    }

    toggleLabel(data) {
        const scene = this.getScene(data.sceneId);
        if (!scene) return;
        const label = scene.labelPlayer.findLabelById(data.labelId)

        if(!label) return

        label.setHidden(!data.value)
    }

    reset() {
        for(let sceneProxy of this.arSessionManager.sceneManager.getScenes()) {
            const scene = toRaw(sceneProxy)
            for(const asset of scene.getAssets()) {
                this.highlight({sceneId: scene.sceneId, assetId: asset.id, value: false})
                this.toggleAsset({sceneId: scene.sceneId, assetId: asset.id, value: true})
                this.setActiveAnimation({sceneId: scene.sceneId, assetId: asset.id, value: null})
            }

            for(const label of scene.labelPlayer.getLabels()) {
                this.toggleLabel({sceneId: scene.sceneId, labelId: label.id, value: true})
            }
        }
        void this.arSessionManager.sceneManager.setFirstActive()
    }

    hideAll(data) {
        const scene = this.getScene(data?.sceneId);
        if (!scene) return;

        for(const asset of scene.getAssets())
            this.toggleAsset({sceneId: scene.sceneId, assetId: asset.id, value: false})

        for(const label of scene.labelPlayer.getLabels())
            this.toggleLabel({sceneId: scene.sceneId, labelId: label.id, value: false})
    }

    showAll(data) {
        const scene = this.getScene(data?.sceneId);
        if (!scene) return;

        for(const asset of scene.getAssets())
            this.toggleAsset({sceneId: scene.sceneId, assetId: asset.id, value: true})

        for(const label of scene.labelPlayer.getLabels())
            this.toggleLabel({sceneId: scene.sceneId, labelId: label.id, value: true})
    }


}

