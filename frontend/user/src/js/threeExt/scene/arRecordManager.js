import {ENDPOINT} from "@/js/endpoints.js";
import {UserSession} from "@/js/threeExt/user/userSession.js";

export class ArRecordManager {

    recordTimerMs;
    sendRecordsTimerMs;
    recordBuffer = [];
    userTempId;
    intervalRecordId = -1;
    intervalSendRecordsId = -1;

    constructor(recordTimerMs = 2000, sendRecordsTimerMs = 30000) {
        this.recordTimerMs = recordTimerMs;
        this.sendRecordsTimerMs = sendRecordsTimerMs;
        const userSession = new UserSession();
        this.userTempId = userSession.getUserId();
    }

    async addToBuffer(data){
        data["userId"] = this.userTempId;
        this.recordBuffer.push(data)
    }

    async sendData(){
        if (this.recordBuffer.length === 0) return;
        const dataToSend = [...this.recordBuffer];
        this.recordBuffer = [];
        await fetch(`${ENDPOINT}records/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });
    }
}