import {Mesh} from "@/js/threeExt/modelManagement/mesh.js";

class MeshManagerInstance {
    #meshes;

    constructor() {
        this.#meshes = [];
    }


    #indexOf(url){
        let index = 0;
        for (let mesh of this.#meshes) {
            if(mesh.sourceUrl === url) return index;
            index++;
        }
        return -1;
    }

    isLoaded(url){
       return this.#indexOf(url) !== -1;
    }

    getMesh(url){
        return this.#meshes[this.#indexOf(url)];
    }

    async load(url){
        if(this.isLoaded(url)) {
            console.warn("mesh already loaded");
            return this.getMesh(url);
        }
        const mesh = new Mesh(url);
        await mesh.load();
        this.#meshes.push(mesh);
        return mesh;
    }
}



export const MeshManager = (function () {
    let instance;

    function createInstance() {
        return new MeshManagerInstance();
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
