
export class Sound {
    name;
    url;
    playOnStartup;
    isLoopingEnabled;

    isPlay

    constructor(soundData){
        this.name = soundData.name;
        this.url = soundData.url;
        this.playOnStartup = soundData.playOnStartup;
        this.isLoopingEnabled = soundData.isLoopingEnabled;
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