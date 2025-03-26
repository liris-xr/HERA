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

    async load(url){
        if(this.isLoaded(url)) {
            console.warn("object already loaded");
            return this.getObject(url);
        }
        const object = new Object3D(url);
        await object.load();
        this.#objects.push(object);
        
        return object;
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
