import {EditorError} from "@/js/threeExt/error/editorError.js";
import i18n from "@/i18n.js";

export class MeshLoadError extends EditorError {
    constructor(filename) {
        super(i18n.global.t('sceneView.rightSection.fileLoadError.title'), i18n.global.t('sceneView.rightSection.fileLoadError.message')+" "+filename+".");
    }
}
