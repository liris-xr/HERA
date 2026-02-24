import {computed, shallowReactive} from "vue";
import {RenderLoopInterface} from "@/js/threeExt/interfaces/RenderLoopInterface.js";

export class TriggerPlayer extends RenderLoopInterface{

    #trigger

    #startOffset
    #currentTime;
    #maxTimestamp;

    constructor() {
        super();

        this.#trigger = shallowReactive([]);

        this.#startOffset = 0;
        this.#currentTime = 0;
        this.#maxTimestamp = 0;
    }

    init(){}


    hasTriggers = computed(()=>{
        return this.#trigger.length>0;
    })


    play(){
        this.isPlaying.value = true;
    }

    pause(){
        this.isPlaying.value = false;
    }
    reset(){
        this.pause();
        this.#startOffset = this.#currentTime
    }

}
