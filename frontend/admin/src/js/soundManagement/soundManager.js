import {computed, shallowReactive} from "vue";

let currentSoundsId = 0;

export class SoundManager {
    #sounds;
    onChanged;

    constructor() {
        this.#sounds = shallowReactive([]);
    }

    getSounds = computed(()=>{
        return this.#sounds;
    });

    addToScene(scene,sound){
        if (sound.id === null){
            sound.id = 'new-sounds' + (currentSoundsId++);
        }

        this.#sounds.push(sound);
        this.runOnChanged();

        return sound;
    }

    removeFromScene(scene, sound,){
        let self = this;
        this.#sounds.forEach(function(currentSound, index, object) {
            if (sound.id === currentSound.id) {
                object.splice(index, 1);
                scene.remove(sound);
                self.runOnChanged();
                return true;
            }
        });
        return false;
    }

    runOnChanged() {
        if(this.onChanged)
            this.onChanged();
    }

    getResultSounds(){
        const result = [];
        for (let sound of this.#sounds) {
            result.push({
                id: sound.id,
                url: sound.url,
                name: sound.name,
                playOnStartup: sound.playOnStartup.value,
                isLoopingEnabled: sound.isLoopingEnabled.value,
                copiedUrl: sound?.copiedUrl,
            });
        }
        return result;
    }

    hasSound = computed(()=>{
        return this.#sounds.length>0;
    })

    getResultUploads(){
        const uploads = [];
        for (let sound of this.#sounds) {
            if(sound.uploadData != null)
                uploads.push(sound.uploadData);
        }
        return uploads;
    }

    setUploaded(sounds, idsMatching){
        for (let id of idsMatching) {
            for (let sound of this.#sounds) {
                if(sound.id === id.tempId){
                    sound.id = id.newId;
                }
            }
        }

        for (let i = 0; i < sounds.length; i++) {
            for (let j = 0; j<this.#sounds.length; j++) {
                if(sounds[i].id === this.#sounds[j].id){
                    this.#sounds[j].setUploadedAtUrl(sounds[i].url);
                }
            }
        }
    }
}