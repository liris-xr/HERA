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


}

