export class TriggerAction {
    id

    action
    object
    timestampStart



    constructor(obj) {
        this.id = Date.now() + Math.random();


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




}