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

    #assetAnimate;

    #labelPlayer

    constructor(parameters) {
        this.#triggers = parameters.triggers;
        this.#assets = parameters.assets;
        this.#sounds = parameters.sounds;

        this.#activeSounds = [];
        this.#audioLoader = new THREE.AudioLoader();
        this.#listener = new THREE.AudioListener();

        this.#scenes = parameters.scenes;
        this.#changeScene = parameters.changeScene;

        this.#assetAnimate = [];

        this.#labelPlayer = parameters.labelPlayer;

        this.#initActions();
    }

    doAction(action, object) {
        this.actions[action](object);
    }

    #initActions(){
        this.actions = {
            none : () => {
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
                this.#changeScene(object);
            },
            animation: (object) => {
                object = object.split(" : ")
                const animation = object[1];

                let assetToAnimate;
                this.#assets.forEach(asset => {
                    if (asset.name === object[0]){
                        assetToAnimate = asset;
                    }
                })

                assetToAnimate.playAnimation(animation)
            },
            startDialogue: () => {
                if (this.#labelPlayer.labelPlayerFinish()){
                    this.#labelPlayer.reset();
                    this.#labelPlayer.togglePlaying();
                }

                this.#labelPlayer.togglePlaying();
            },
            displayAsset: (object) => {
                let assetToAnimate;
                this.#assets.forEach(asset => {
                    if (asset.name === object){
                        assetToAnimate = asset;
                    }
                })

                assetToAnimate.hide()
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

    changeParameters(parameters){
        this.#triggers = parameters.triggers;
        this.#assets = parameters.assets;
        this.#sounds = parameters.sounds;
        this.#labelPlayer = parameters.labelPlayer;
    }
}