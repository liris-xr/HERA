import {ENDPOINT} from "@/js/endpoints.js";
import {UserSession} from "@/js/threeExt/user/userSession.js";

export class ArRecordManager {

    recordTimerMs;
    sendRecordsTimerMs;
    recordBuffer = [];
    userTempId;
    intervalRecordId = -1;
    intervalSendRecordsId = -1;

    constructor() {
        const userSession = new UserSession();
        this.userTempId = userSession.getUserId();
    }

    async fetchAnalyticsConfig() {
        try {
            const res = await fetch(`${ENDPOINT}config/analytics`);
            if (res.ok) {
                const config = await res.json();
                this.recordTimerMs = config.recordTimerMs || 2000;
                this.sendRecordsTimerMs = config.sendRecordsTimerMs || 30000;
            }
        } catch (e) {
            console.warn(e);
        }
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

    getSecondsBetweenEachRecord(){
        return Math.ceil((this.recordTimerMs)/1000);
    }
}