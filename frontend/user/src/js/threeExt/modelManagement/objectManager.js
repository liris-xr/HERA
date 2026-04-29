import { Object3D } from "@/js/threeExt/modelManagement/object3D.js";

class ObjectManagerInstance {
    async load(url) {
        const object = new Object3D(url);
        await object.load();
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