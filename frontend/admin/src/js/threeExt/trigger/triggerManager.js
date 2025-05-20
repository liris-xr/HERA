import {computed, shallowReactive} from "vue";
import {MeshLoadError} from "@/js/threeExt/error/meshLoadError.js";
import {Trigger} from "@/js/threeExt/trigger/trigger.js";
import {ActionManager} from "@/js/threeExt/trigger/actionManager.js";

let currentTriggerId = 0;

export class TriggerManager {
    #triggers;
    onChanged;
    #actionManager;

    constructor() {
        this.#triggers = shallowReactive([]);
        this.#actionManager = new ActionManager();
    }

    getTriggers = computed(()=>{
        return this.#triggers;
    });

    addToScene(scene,trigger = null){
        if (trigger === null){
            trigger = {
                id : 'new-trigger' + (currentTriggerId++),
                hideInViewer: false
            };
        }

        const newTrigger = new Trigger(trigger);


        newTrigger.load().then((mesh)=>{
            scene.add(mesh)
        }).catch(()=>{
                scene.appendError(new MeshLoadError("Failed to load trigger."));
            }
        );

        this.#triggers.push(newTrigger);
        this.runOnChanged();
        return newTrigger;
    }

    removeFromScene(scene, trigger,){
        let self = this;
        this.#triggers.forEach(function(currentTrigger, index, object) {
            if (trigger.id === currentTrigger.id) {
                object.splice(index, 1);
                scene.remove(trigger.getObject());
                self.runOnChanged();
                return true
            }
        });
        return false;

    }

    runOnChanged() {
        if(this.onChanged)
            this.onChanged();

    }

    getResultAssets(){
        const result = []
        for (let trigger of this.#triggers) {
            result.push({
                id: trigger.id,
                position:trigger.getResultPosition(),
                scale: trigger.getResultScale(),
                hideInViewer: trigger.hideInViewer.value
            });
        }
        return result;
    }

    hasTriggers = computed(()=>{
        return this.#triggers.length>0;
    })


}