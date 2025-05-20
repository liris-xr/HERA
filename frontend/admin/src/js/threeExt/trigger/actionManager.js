import i18n from "@/i18n.js";

// i18n.global.t()

export class  ActionManager {
    #actions = {
        None : "None",
        play_sound: () => {
            // Code pour jouer un son
            console.log("Son lancé !");
        },
        change_scene: () => {
            // Code pour changer de scène
            console.log("Scène changée !");
        },
        trigger_animation: () => {
            // Code pour activer une animation
            console.log("Animation déclenchée !");
        },
        start_dialogue: () => {
            // Code pour lancer le dialogue
            console.log("Dialogue lancé !");
        }
    };

    getActions(){return this.#actions;}
}