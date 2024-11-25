import {ImplementationError} from "@/js/utils/implementationError.js";

export class RenderLoopInterface {
    async init(){
        throw new ImplementationError("init");
    }

    onXrFrame(time, frame){
        throw new ImplementationError("onXrFrame");
    }
}
