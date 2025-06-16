import {ActionManager} from "@/js/threeExt/TriggerManagement/actionManager.js";

export class TriggerAction {
    action
    object
    timestampStart

    hasBeenPlayed

    constructor(obj) {
        if (obj.action) {
            this.action = obj.action;
        }
        else{
            this.action = "none";
        }

        if (obj.object) {
            this.object = obj.object;
        }
        else{
            this.object = "none";
        }

        if (obj.timestampStart) {
            this.timestampStart = obj.timestampStart;
        }
        else{
            this.timestampStart = 0;
        }

        this.hasBeenPlayed = false;
    }


    getAction() {
        return this.action;
    }

    getObject() {
        return this.object;
    }

    getTimestampStart() {
        return this.timestampStart;
    }



    setAction(action){
        this.action = action;
    }


    setObject (object){
        this.object = object;
    }

    setTimestampStart(timestampStart){
        this.timestampStart = timestampStart;
    }

    shouldBePlaying(time){
        if (time === 0){return false}
        if (this.hasBeenPlayed) {return false}
        if(this.timestampStart === 0) return true;

        console.log("FAIRE ACTION DU TRIGGER: " + time + " RES: " + (this.timestampStart > (time) && this.timestampStart < (time+250)));

        return (this.timestampStart >= (time) && this.timestampStart < (time+250));

    }

    pauseAction(){
        const actionManager = new ActionManager()

        this.hasBeenPlayed = false;

        actionManager.doAction(this.action, this.object);
    }

    playAction() {
        const actionManager = new ActionManager()
        this.hasBeenPlayed = true;
        console.log("ACTIONNNNN")

        console.log(actionManager);

        actionManager.doAction(this.action, this.object);
    }

    reset(){
        this.hasBeenPlayed = false;
    }

}