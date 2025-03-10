import { shallowReactive } from "vue";

let currentMeshId = 0;
export class MeshManager {
    #meshes
    onChanged;
    onMoved;

    constructor() {
        this.#meshes = shallowReactive([]);
    }

    getMeshes = computed(()=>{
        return this.#meshes;
    });

    addToScene(scene,mesh,onAdd) {
        if(!mesh.id) mesh.id = 'new-mesh'+currentMeshId++

        
    }
}