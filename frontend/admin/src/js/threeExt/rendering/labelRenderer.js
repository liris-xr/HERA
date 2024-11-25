import {CSS2DRenderer} from "three/addons";
import {computed, ref} from "vue";
import {ToggleableInterface} from "@/js/threeExt/interfaces/ToggleableInterface.js";
import {classes} from "@/js/utils/extender.js";
import {DomElementInterface} from "@/js/threeExt/interfaces/domElementInterface.js";

export class LabelRenderer extends classes(CSS2DRenderer, ToggleableInterface, DomElementInterface) {
    #domWidth
    #domHeight
    #isEnabled;

    constructor() {
        super();
        this.#isEnabled = ref(true);

        this.setDomSize(window.innerWidth, window.innerHeight);
        this.domElement.style.position = 'absolute';
        this.domElement.style.top = '0px';
        this.domElement.style.left = '0px';
        this.domElement.style.width = '100%';
        this.domElement.style.height = '100%';
        this.domElement.style.pointerEvents = 'none';

        this.enable();
    }


    isEnabled = computed(()=>{
        return this.#isEnabled.value;
    })

    enable(){
        this.#isEnabled.value = true;
    }

    disable(){
        this.#isEnabled.value = false;
    }

    toggleStatus(){
        this.#isEnabled.value = !this.#isEnabled.value;
    }

    setDomSize(width, height) {
        this.#domWidth = width;
        this.#domHeight = height;
        this.updateSize()
    }

    updateSize(){
        this.setSize(this.#domWidth, this.#domHeight);
    }

    clear(){
        this.domElement.innerHTML='';
    }
}
