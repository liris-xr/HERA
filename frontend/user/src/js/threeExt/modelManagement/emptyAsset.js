import {Asset} from "@/js/threeExt/modelManagement/asset.js";
import * as THREE from "three";

export class EmptyAsset extends Asset{

    constructor() {
        super({
            url:"empty",
            name:"empty"

        });
        this.object = new THREE.Mesh()
    }


    load(){}
}