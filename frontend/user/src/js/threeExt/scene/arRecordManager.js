export class ArRecordManager {

    recordTimerMs;
    sendRecordsTimerMs;
    recordBuffer = [];

    constructor(recordTimerMs = 2000, sendRecordsTimerMs = 15000) {
        this.recordTimerMs = recordTimerMs;
        this.sendRecordsTimerMs = sendRecordsTimerMs;
    }

    addToBuffer(data){
        /*
         TODO record also needs
         id
         projectId
         sceneId
         userId
         */
        this.recordBuffer.push(data)
    }

    sendData(){
        if (this.recordBuffer.length === 0) return;
        const dataToSend = [...this.recordBuffer];
        this.recordBuffer = [];
        //TODO appel api pour post record.js
        /*await fetch('/api/add-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });*/
    }
}