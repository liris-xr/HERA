import {classes} from "@/js/utils/extender.js";
import {SelectableInterface} from "@/js/threeExt/interfaces/selectableInterface.js";
import {LoadableInterface} from "@/js/threeExt/interfaces/loadableInterface.js";
import {computed, ref} from "vue";
import * as THREE from "three";


export class Trigger extends classes(SelectableInterface, LoadableInterface){
    id;

    mesh;
    #geometry;
    #material;

    radius
    position;
    scale;

    hideInViewer;
    action;

    #isSelected;
    #hasError;
    #isLoading;

    constructor(triggerData) {
        super();
        this.id = triggerData.id;
        this.#isSelected = ref(false);

        this.hideInViewer = ref(triggerData.hideInViewer);

        if(triggerData.radius){
            this.radius = triggerData.radius;
        }
        else {
            this.radius = 0.5;
        }

        if(triggerData.position){
            this.position = triggerData.position;
        }
        else {
            this.position = {x:0, y:0, z:0};
        }

        if(triggerData.scale){
            this.scale = triggerData.scale;
        }
        else {
            this.scale = {x:1, y:1, z:1};
        }

        if (triggerData.action){
            this.action = triggerData.action;
        }
        else{
            this.action = "None";
        }

        this.#hasError = ref(false);
        this.#isLoading = ref(true);

        this.mesh = this.load()
    }

    hasError = computed(()=>{
        return this.#hasError.value;
    })

    isLoading = computed(()=>{
        return this.#isLoading.value;
    })

    isSelected = computed(()=>{
        return this.#isSelected.value;
    });




    load(){
        return new Promise((resolve) => {
            this.#hasError.value = false;
            this.#isLoading.value = false;

            this.#geometry = new THREE.SphereGeometry( this.radius, 32, 16 );
            this.#material = new THREE.MeshBasicMaterial( { color: 0xccaacc } );
            this.mesh = new THREE.Mesh( this.#geometry, this.#material );
            this.mesh.position.set(this.position.x, this.position.y, this.position.z);
            this.mesh.scale.set(this.scale.x, this.scale.y, this.scale.z);



            resolve(this.mesh);
        })
    }

    pushToScene(scene){
        console.log("pushToScene", scene)
        if(!this.label) return false;
        scene.add(this.label);
        return true;
    }

    switchViewerDisplayStatus(){
        this.hideInViewer.value = !this.hideInViewer.value;
    }

    setSelected(selected){
        this.#isSelected.value = selected;
    }


    getObject(){
        return this.mesh;
    }

    getResultPosition(){
        const result = {}
        result.x = this.getObject().position.x;
        result.y = this.getObject().position.y;
        result.z = this.getObject().position.z;
        return result;
    }

    getResultScale(){
        const result = {}
        result.x = this.getObject().scale.x;
        result.y = this.getObject().scale.x;
        result.z = this.getObject().scale.x;
        return result;
    }

    getRangeOfAction(){
        return this.#geometry.radius;
    }

    setAction(action){
        this.action = action;
    }
}
