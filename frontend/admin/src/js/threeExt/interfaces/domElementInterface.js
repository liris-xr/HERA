import {ImplementationError} from "@/js/utils/implementationError.js";

export class DomElementInterface{

    setDomSize(width, height){
        throw new ImplementationError("setDomSize");
    }

    updateSize(){
        throw new ImplementationError("updateSize");
    }
}
