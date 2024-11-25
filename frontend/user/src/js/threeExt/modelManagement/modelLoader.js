import * as THREE from "three/addons";

export const ModelLoader = (function () {
    let instance;

    function createInstance() {
        return new THREE.GLTFLoader();
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
