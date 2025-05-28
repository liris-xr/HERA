import {classes} from "@/js/utils/extender.js";
import {SelectableInterface} from "@/js/threeExt/interfaces/selectableInterface.js";
import {LoadableInterface} from "@/js/threeExt/interfaces/loadableInterface.js";
import {computed, ref} from "vue";

export class Sound extends classes(SelectableInterface, LoadableInterface){
    id;
    url;
    copiedUrl;
    uploadData;
    name;

    playOnStartup;
    isLoopingEnabled;

    #hasError;
    #isLoading;


    constructor(soundData) {
        super();
        this.id = soundData.id;
        this.name = soundData.name;
        this.url = soundData.url;
        this.uploadData = soundData.uploadData || null;

        if(soundData.playOnStartup){
            this.playOnStartup = ref(soundData.playOnStartup);
        }
        else{
            this.playOnStartup = ref(false);
        }

        if(soundData.isLoopingEnabled){
            this.isLoopingEnabled = ref(soundData.isLoopingEnabled);
        }
        else{
            this.isLoopingEnabled = ref(false);
        }

        if(soundData?.copiedUrl)
            this.copiedUrl = soundData.copiedUrl;

        this.#hasError = ref(false);
        this.#isLoading = ref(false);
    }

    hasError = computed(()=>{
        return this.#hasError.value;
    })

    isLoading = computed(()=>{
        return this.#isLoading.value;
    })

    isSelected = computed(()=>false);


    switchPlayOnStartupStatus(status){
        this.playOnStartup.value = status;
    }

    switchLoopingEnabledStatus(status){
        this.isLoopingEnabled.value = status;
    }

    setUploadedAtUrl(url){
        this.uploadData = null;
        this.url = url;
    }
}