import {ImplementationError} from "@/js/utils/implementationError.js";

export const SceneElementInterface = class{

    pushToScene(scene){
        throw new ImplementationError("pushToScene")
    }
}
