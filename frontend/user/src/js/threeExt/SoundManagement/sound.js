export class Sound {
    id;
    name;
    url;
    playOnStartup;
    isLoopingEnabled;

    isPlay;

    constructor(soundData){
        this.id = soundData.id;
        this.name = soundData.name;
        this.url = soundData.url;

        if (soundData.playOnStartup){
            this.playOnStartup = soundData.playOnStartup;
        }
        else {
            this.playOnStartup = false;
        }

        if(soundData.playOnStartup){
            this.isLoopingEnabled = soundData.isLoopingEnabled;
        }
        else {
            this.isLoopingEnabled = false;
        }

        this.isPlay = false;
    }

    isPlaying () {
        return this.isPlay;
    }

    play() {
        this.isPlay = true;
    }
    stop() {
        this.isPlay = false;
    }
}