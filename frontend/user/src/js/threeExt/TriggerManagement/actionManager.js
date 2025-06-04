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
            playSound: (object) => {
                let soundToPlay;
                this.#sounds.forEach((sound) => {
                    if (object.url === sound.url){
                        soundToPlay = sound;
                    }
                })

                if (soundToPlay === undefined){return;}
                if (soundToPlay.isPlaying()){
                    this.stopSounds(soundToPlay);
                    return;
                }

                const audio = new THREE.Audio(this.#listener);
                this.#audioLoader.load(getResource(soundToPlay.url), (buffer) => {
                    audio.setBuffer(buffer);
                    audio.setLoop(soundToPlay.isLoopingEnabled);
                    audio.setVolume(1);
                    audio.play();
                    soundToPlay.play();
                    this.#activeSounds.push([soundToPlay, audio]);
                });
            },
            changeScene: (object) => {
                if (object.label === undefined){return;}
                this.#changeScene(object.label);
            },
            animation: (object) => {
                if (object.animation === "none"){return;}

                let assetToAnimate;
                this.#assets.forEach(asset => {
                    if (asset.id === object.id){
                        assetToAnimate = asset;
                    }
                })

                if (assetToAnimate === undefined){return;}

                if (assetToAnimate.playingAction) {
                    assetToAnimate.playAnimation(null);
                } else {
                    assetToAnimate.playAnimation(object.animation);
                }
            },
            startDialogue: () => {
                if (this.#labelPlayer.labelPlayerFinish()){
                    this.#labelPlayer.reset();
                    this.#labelPlayer.togglePlaying();
                }

                this.#labelPlayer.togglePlaying();
            },
            displayAsset: (object) => {
                let assetToDisplay;
                this.#assets.forEach(asset => {
                    if (asset.id === object.id){
                        assetToDisplay = asset;
                    }
                })

                if (assetToDisplay === undefined){return;}

                assetToDisplay.hide()
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
            if (sound[0].url === soundCurrentlyPlaying.url) {
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