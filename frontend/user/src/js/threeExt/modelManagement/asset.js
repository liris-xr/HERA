import {ObjectManager} from "@/js/threeExt/modelManagement/objectManager.js";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";

export class Asset extends SceneElementInterface{

    object
    sourceUrl
    position;
    rotation;
    scale;
    name;

    #error;




    constructor(assetData) {
        super();

        this.sourceUrl = assetData.url;
        this.name = assetData.name != null ? assetData.name : assetData.url;
        if(assetData.position)
            this.position = assetData.position;
        else
            this.position = {x:0,y:0, z:0};

        if(assetData.rotation)
            this.rotation = assetData.rotation;
        else
            this.rotation = {x:0,y:0, z:0};

        if(assetData.scale)
            this.scale = assetData.scale;
        else
            this.scale = {x:1,y:1, z:1};

        this.#error = false;
    }

    hasError(){
        return this.#error;
    }

    async load(){
        const manager = ObjectManager.getInstance();
        let object = await manager.load(this.sourceUrl);
        this.#error = object.hasError();
        this.object = object.object.clone();
        this.object.position.set(this.position.x, this.position.y, this.position.z);
        this.object.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        this.object.scale.set(this.scale.x, this.scale.y, this.scale.z);
        this.object.castShadow = true;
        this.object.receiveShadow = true;
    }

    pushToScene(scene){
        if(!this.object) return false;
        scene.add(this.object);
        return true;
    }
}
