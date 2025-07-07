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

    static #instance;

    constructor(parameters) {
        if (ActionManager.#instance) {
            return ActionManager.#instance;
        }

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

        ActionManager.#instance = this;
    }

    doAction(action, object) {
        return this.actions[action](object);
    }

    #initActions(){
        this.actions = {
            none : () => {
                return true; // DON'T DO ANYTHING
            },
            playSound: (object) => {
                let soundToPlay;
                this.#sounds.forEach((sound) => {
                    if (object.url === sound.url){
                        soundToPlay = sound;
                    }
                })

                if (soundToPlay === undefined){
                    console.warn("Sound not found.");
                    return false;
                }

                if (soundToPlay.isPlaying()){
                    console.warn("Sound already playing.");
                    this.stopSounds(soundToPlay);
                    return false;
                }

                const audio = new THREE.Audio(this.#listener);
                this.#audioLoader.load(getResource(soundToPlay.url), (buffer) => {
                    audio.setBuffer(buffer);
                    audio.setLoop(soundToPlay.isLoopingEnabled);
                    audio.setVolume(object.volumeLevel);
                    audio.play();
                    soundToPlay.play();
                    this.#activeSounds.push([soundToPlay, audio]);
                });

                return true;
            },
            changeScene: (object) => {
                if (object.label === undefined){return false;}

                this.#changeScene(object.label);

                return true;
            },
            animation: (object) => {
                if (object.animation === "none"){return false;}

                let assetToAnimate;
                this.#assets.forEach(asset => {
                    if (asset.id === object.id){
                        assetToAnimate = asset;
                    }
                })

                if (assetToAnimate === undefined){
                    console.warn("Asset to animate not found.");
                    return false;
                }

                if (assetToAnimate.playingAction) {
                    console.warn("Animation stopped.");
                    assetToAnimate.playAnimation(null);
                    return true;
                } else {
                    assetToAnimate.playAnimation(object.animation);
                    return true;
                }
            },
            startDialogue: () => {
                if (this.#labelPlayer === undefined){
                    console.warn("labelPlayer undefined.");
                    return false;
                }

                this.#labelPlayer.togglePlaying();

                return true;
            },
            displayAsset: (object) => {
                let assetToDisplay;
                this.#assets.forEach(asset => {
                    if (asset.id === object.id){
                        assetToDisplay = asset;
                    }
                })

                if (assetToDisplay === undefined){
                    console.warn("Asset to display not found.");
                    return false;
                }

                assetToDisplay.hide(!assetToDisplay.hidden.value);

                return true;
            },
            displayTrigger : (object) => {
                let triggerToDisplay;

                this.#triggers.forEach(trigger => {
                    if (trigger.id === object.id){
                        triggerToDisplay = trigger;
                    }
                })

                if (triggerToDisplay === undefined){
                    console.warn("Trigger to display not found");
                    return false;
                }

                triggerToDisplay.hide(!triggerToDisplay.hideInViewer);

                return true;
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

    stopSounds(soundCurrentlyPlaying) { // sound[0] : object Sound - sound[1]; object Audio
        this.#activeSounds.forEach(sound => {
            if (sound[0].id === soundCurrentlyPlaying.id) {
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