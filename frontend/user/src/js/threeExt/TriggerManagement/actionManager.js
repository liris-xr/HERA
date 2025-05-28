import * as THREE from "three";
import {getResource} from "@/js/endpoints.js";

export class ActionManager {
    actions
    #triggers
    #assets
    #sounds
    #scenes

    #changeScene

    #activeSounds
    #audioLoader;
    #listener;

    constructor(arrays) {
        console.log(arrays);

        this.#triggers = arrays.triggers;
        this.#assets = arrays.assets;
        this.#sounds = arrays.sounds;

        this.#activeSounds = [];
        this.#audioLoader = new THREE.AudioLoader();
        this.#listener = new THREE.AudioListener();

        this.#scenes = arrays.scenes;
        this.#changeScene = arrays.changeScene;

        this.#initActions();
    }

    doAction(action, object) {
        this.actions[action](object);
    }

    #initActions(){
        this.actions = {
            none : (object) => {
                // DON'T DO ANYTHING
            },
            playSound: (soundName) => {
                let sound;
                this.#sounds.forEach((s) => {
                    if (soundName === s.name){
                        sound = s;
                    }
                })

                if (sound === undefined){return;}
                if (sound.isPlaying()){return;}

                const audio = new THREE.Audio(this.#listener);
                this.#audioLoader.load(getResource(sound.url), (buffer) => {
                    audio.setBuffer(buffer);
                    audio.setLoop(sound.isLoopingEnabled);
                    audio.setVolume(1);
                    audio.play();
                    sound.play();
                    this.#activeSounds.push([sound, audio]);
                });
            },
            changeScene: (object) => {
                this.stopAllSounds()
                this.#changeScene(object);
            },
            animation: (object) => {
                // Code pour activer une animation
                console.log("Animation déclenchée !");
                console.log(object);
            },
            startDialogue: (object) => {
                // Code pour commencer un dialogue
                console.log("Commencer un dialogue");
                console.log(object);
            },
            displayAsset: (object) => {
                // Code pour afficher un asset
                console.log("afficher un asset");
                console.log(object);
            }
        };

    }

    stopAllSounds() {
        this.#activeSounds.forEach(sound => {
            if (sound[0].isPlaying()) {
                sound[1].stop();
                sound[0].stop();
            }
        });
        this.#activeSounds.length = [];
    }

    changeParameters(newArrays){
        this.#triggers = newArrays.triggers;
        this.#assets = newArrays.assets;
        this.#sounds = newArrays.sounds;
    }
}