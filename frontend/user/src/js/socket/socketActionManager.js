import * as THREE from "three";
import {OutlinePass} from "three/addons";

export class SocketActionManager {

    arSessionManager

    constructor(arSessionManager) {
        this.arSessionManager = arSessionManager;
    }

    highlight(data) {

        const scene = unpack(this.arSessionManager.sceneManager.active)

        const asset = scene.findAssetById(data.assetId)

        if(!asset) return

        asset.highlight = data.value

        asset.mesh.traverse((child) => {

            if(child.isMesh && child.material) {
                if(!child.oldMaterial)
                    child.oldMaterial = child.material

                if(asset.highlight) {
                    child.material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
                } else
                    child.material = child.oldMaterial
            }

        })
    }

    toggle(data) {
        const scene = unpack(this.arSessionManager.sceneManager.active)
        const asset = scene.findAssetById(data.assetId)

        if(!asset) return

        asset.hidden = data.value

            asset.mesh.visible = !asset.hidden

    }

    scene(data) {

        this.arSessionManager.sceneManager.activeSceneId.value = data.sceneId

    }


}

function unpack(variable) {
    if(variable.value) return variable.value
    return variable
}