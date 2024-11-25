import {computed, ref, shallowReactive} from "vue";
import {Label} from "@/js/threeExt/postprocessing/label.js";
import i18n from "@/i18n.js";

let currentLabelId = 0;
export class LabelManager {
    #labels;
    onChanged;

    constructor() {
        this.#labels = shallowReactive([]);
    }

    getLabels = computed(()=>{
        return this.#labels;
    });

    getSelectedLabel = computed(()=>{
        for (let label of this.#labels) {
            if(label.isSelected.value) return label;
        }
        return null;
    })


    addToScene(scene,labelData = null){
        if(labelData == null){
            labelData = {
                text : i18n.global.t("sceneView.leftSection.sceneLabels.newLabelText")+" "+currentLabelId,
                id: 'new-lab'+currentLabelId,
                position : {x:0, y:0, z:0},
                timestampStart: 0,
                timestampEnd: null,
            }
            currentLabelId++;
        }
        const newLabel = new Label(labelData);
        newLabel.onChanged = ()=>this.runOnChanged();
        this.#labels.push(newLabel);
        newLabel.pushToScene(scene);
        this.runOnChanged()
        return newLabel;
    }

    removeFromScene(scene, label){
        let self = this
        this.#labels.forEach(function(currentLabel, index, object) {
            if (label.id === currentLabel.id) {
                object.splice(index, 1);
                scene.remove(label.getObject());
                self.runOnChanged()
                return true
            }
        });
        return false;
    }

    hasLabels = computed(()=>{
        return this.#labels.length>0;
    })

    getResultLabel(){
        const result = []
        for (let label of this.#labels) {
            result.push({
                id: label.id,
                position:label.getResultPosition(),
                text: label.content.value,
                timestampStart: label.timestampStart,
                timestampEnd: label.timestampEnd,
            });
        }
        return result;
    }


    runOnChanged(){
        if(this.onChanged)
            this.onChanged();

    }

}
