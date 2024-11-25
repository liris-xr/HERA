import {ImplementationError} from "@/js/utils/implementationError.js";
import {computed} from "vue";

export class ToggleableInterface {
    enable(){
        throw new ImplementationError("enable");
    }

    disable(){
        throw new ImplementationError("disable");
    }

    toggleStatus(){
        throw new ImplementationError("toggleStatus");
    }

    isEnabled = computed(()=> {throw new ImplementationError("isEnabled");});

}
