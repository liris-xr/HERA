import {ImplementationError} from "@/js/utils/implementationError.js";
import {computed} from "vue";

export class SelectableInterface {
    setSelected(selected){
        throw new ImplementationError("setSelected");
    }

    isSelected = computed(()=> {throw new ImplementationError("isSelected");});
}
