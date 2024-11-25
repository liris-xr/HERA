import {ArError} from "@/js/threeExt/error/arError.js";
import i18n from "@/i18n.js";

export class ArMeshLoadError extends ArError {
    constructor(filename) {
        super(i18n.global.t("meshLoadError.title"), i18n.global.t("meshLoadError.message")+filename+".");
    }
}
