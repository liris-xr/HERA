import {ImplementationError} from "@/js/utils/implementationError.js";
import {computed} from "vue";

export class LoadableInterface {

    hasError = computed(() => {throw new ImplementationError("hasError");});
    isLoading = computed(() => {throw new ImplementationError("isLoading");});

}
