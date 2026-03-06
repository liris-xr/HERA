import * as THREE from "three/addons";

export const ModelLoader = (function () {
    let instance;

    function createInstance() {
        const loader = new THREE.GLTFLoader();

        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath("/editor/draco/");
        //loader.setDRACOLoader(dracoLoader);

        return loader;
    }

    return {
        getInstance: function () {
            if (!instance) instance = createInstance();
            return instance;
        }
    };
})();
