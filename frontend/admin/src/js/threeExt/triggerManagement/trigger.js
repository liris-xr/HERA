import {classes} from "@/js/utils/extender.js";
import {SelectableInterface} from "@/js/threeExt/interfaces/selectableInterface.js";
import {LoadableInterface} from "@/js/threeExt/interfaces/loadableInterface.js";
import {computed, ref} from "vue";
import * as THREE from "three";
import {TriggerAction} from "@/js/threeExt/triggerManagement/triggerAction.js";

export class Trigger extends classes(SelectableInterface, LoadableInterface){
    id;

    mesh;

    radius
    position;
    scale;

    hideInViewer;
    actionIn;
    actionOut;
    objectIn
    objectOut

    #isSelected;
    #hasError;
    #isLoading;

    chainedActions

    constructor(triggerData) {
        super();
        this.id = triggerData.id;
        this.#isSelected = ref(false);

        if(triggerData.hideInViewer){
            this.hideInViewer = ref(triggerData.hideInViewer);
        }
        else {
            this.hideInViewer = ref(false);
        }

        if(triggerData.radius){
            this.radius = triggerData.radius;
        }
        else {
            this.radius = 1;
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
            this.scale = {x:this.radius, y:this.radius, z:this.radius};
        }

        if (triggerData.actionIn){
            this.actionIn = triggerData.actionIn;
        }
        else{
            this.actionIn = "none";
        }

        if(triggerData.actionOut){
            this.actionOut = triggerData.actionOut;
        }
        else{
            this.actionOut = "none";
        }

        if (triggerData.objectIn){
            this.objectIn = triggerData.objectIn;
        }
        else{
            this.objectIn = "none";
        }

        if (triggerData.objectOut){
            this.objectOut = triggerData.objectOut;
        }
        else{
            this.objectOut = "none";
        }

        this.chainedActions = [];
        if (triggerData.chainedActions){
            triggerData.chainedActions.forEach(action => {
                this.chainedActions.push(new TriggerAction(action));
            })
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

            const geometry = new THREE.SphereGeometry(1, 32, 32);
            const wireframe = new THREE.WireframeGeometry(geometry);
            this.mesh = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ color: 0xeeebe3 }));

            this.mesh.position.set(this.position.x, this.position.y, this.position.z);
            this.mesh.scale.set(this.radius, this.radius, this.radius);

            resolve(this.mesh);
        })
    }

    switchViewerDisplayStatus(status){
        this.hideInViewer.value = status;
    }

    setSelected(selected){
        this.#isSelected.value = selected;
    }

    setChainedActions(newChainedActions){
        this.chainedActions = newChainedActions;
    }

    getChainedActions(){
        return this.chainedActions;
    }

    getObject(){
        return this.mesh;
    }

    getActionIn(){
        return this.actionIn;
    }

    getResultPosition(){
        const result = {}
        result.x = this.getObject().position.x;
        result.y = this.getObject().position.y;
        result.z = this.getObject().position.z;
        return result;
    }

    getResultScale(){
        return {x: this.radius, y: this.radius, z: this.radius};
    }

    getResultRotation(){
        return {x:0, y:0, z:0};
    }

    getRadius(){
        return this.radius;
    }

    copyFromAnotherTrigger(otherTrigger){
        this.actionIn = otherTrigger.actionIn;
        this.actionOut = otherTrigger.actionOut;
        this.radius = otherTrigger.radius;
        this.objectIn = otherTrigger.objectIn;
        this.objectOut = otherTrigger.objectOut;
        this.chainedActions = otherTrigger.chainedActions;
    }
}
