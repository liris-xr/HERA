import i18n from "@/i18n.js";

export class  ActionManager {
    #actions = [
        i18n.global.t("sceneView.leftSection.sceneTriggers.actions.none"),
        i18n.global.t("sceneView.leftSection.sceneTriggers.actions.playSound"),
        i18n.global.t("sceneView.leftSection.sceneTriggers.actions.changeScene"),
        i18n.global.t("sceneView.leftSection.sceneTriggers.actions.animation"),
        i18n.global.t("sceneView.leftSection.sceneTriggers.actions.startDialogue"),
    ];

    getActions(){return this.#actions;}
}

