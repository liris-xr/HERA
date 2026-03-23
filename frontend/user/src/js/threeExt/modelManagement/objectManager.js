import {Object3D} from "@/js/threeExt/modelManagement/object3D.js";

class ObjectManagerInstance {
    #objects;

    constructor() {
        this.#objects = [];
    }


    #indexOf(url){
        let index = 0;
        for (let object of this.#objects) {
            if(object.sourceUrl === url) return index;
            index++;
        }
        return -1;
    }

    isLoaded(url){
       return this.#indexOf(url) !== -1;
    }

    getObject(url){
        return this.#objects[this.#indexOf(url)];
    }

    cloneCachedObjects(cachedObject) {
        const clonedScene = cachedObject.object?.clone? cachedObject.object.clone(true) : cachedObject.object ;
        if (clonedScene){
            clonedScene.animations = cachedObject.animations ?? [];
        }
        return {
            sourceUrl: cachedObject.sourceUrl,
            object: clonedScene,
            animations: cachedObject.animations ?? [] ,
            hasError: () => cachedObject.hasError(),

        };
    }
    async load(url){
        if(this.isLoaded(url)) {

             console.warn("[objectManager] cache hit :", url);
             const cachedObject = this.getObject(url);
             return this.cloneCachedObjects(cachedObject);
         }
        console.log("[objectManager] cache miss :", url);

        const object = new Object3D(url);
        await object.load();
        this.#objects.push(object);
        
        return this.cloneCachedObjects(object);
    }
}



export const ObjectManager = (function () {
    let instance;

    function createInstance() {
        return new ObjectManagerInstance();
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();
