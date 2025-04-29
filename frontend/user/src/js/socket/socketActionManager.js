import * as THREE from "three";

export class SocketActionManager {

    arSessionManager

    constructor(arSessionManager) {
        this.arSessionManager = arSessionManager;
    }

    highlight(data) {
        console.log(data)

        const asset = this.arSessionManager.sceneManager.active.value.findAssetById(data.assetId)

        if(asset.highlight !== undefined)
            asset.highlight = !asset.highlight
        else asset.highlight = true

        asset.mesh.traverse((child) => {

            if(child.isMesh && child.material) {
                if(asset.highlight) {
                    child.oldMaterial = child.material
                    child.material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
                } else
                    child.material = child.oldMaterial
            }

        })
    }


}