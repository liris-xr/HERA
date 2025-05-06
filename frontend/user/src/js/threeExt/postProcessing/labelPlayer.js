import {computed, ref, shallowReactive} from "vue";
import {Label} from "@/js/threeExt/postProcessing/label.js";
import {RenderLoopInterface} from "@/js/threeExt/interfaces/RenderLoopInterface.js";

export class LabelPlayer extends RenderLoopInterface{
    #labels;

    #isPlaying;
    #isPaused;

    #startOffset
    #currentTime;
    #maxTimestamp;
    constructor() {
        super();
        this.#labels = shallowReactive([]);
        this.#isPlaying = ref(false);
        this.#isPaused = ref(false);
        this.#startOffset = 0;
        this.#currentTime = 0;
        this.#maxTimestamp = 0;
    }

    init(){}


    addToScene(scene,labelData){
        const newLabel = new Label(labelData);
        if(newLabel.timestampStart > this.#maxTimestamp) this.#maxTimestamp = newLabel.timestampStart;
        if(newLabel.timestampEnd > this.#maxTimestamp) this.#maxTimestamp = newLabel.timestampEnd;
        this.#labels.push(newLabel);
        newLabel.pushToScene(scene);
        return newLabel;
    }

    hasLabels = computed(()=>{
        return this.#labels.length>0;
    })

    getDuration(){
        return this.#maxTimestamp;
    }

    play(){
        this.#isPlaying.value = true;
    }

    pause(){
        this.#isPlaying.value = false;
    }
    reset(){
        this.pause();
        this.#startOffset = this.#currentTime
    }

    togglePlaying(){
        if(this.#isPlaying.value) this.pause()
        else this.play()
    }

    isPlaying = computed(()=>this.#isPlaying.value);

    hideAll(){
        for (let label of this.#labels) {
            label.setVisible(false);
        }
    }

    onXrFrame(time, frame, localReferenceSpace, worldTransformMatrix, cameraPosition) {
        if (!this.hasLabels.value) return;
        const delta = time - this.#currentTime;

        this.#currentTime += delta;

        if (!this.#isPlaying.value)
            this.#startOffset += delta;


        const t = this.#currentTime - this.#startOffset
        for (let label of this.#labels) {
            label.setVisible(label.shouldBeVisible(t));
        }

        if(t>=this.#maxTimestamp) this.pause();
    }

    getLabels(){
        return shallowReactive(this.#labels);
    }

    findLabelById(id) {
        for(const label of this.#labels)
            if(label.id === id)
                return label
        return null
    }
}
