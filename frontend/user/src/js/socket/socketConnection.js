import {io} from "socket.io-client";
import {reactive, ref} from "vue";
import {SocketActionManager} from "@/js/socket/socketActionManager.js";

export class SocketConnection {
    socket
    state = reactive({
        connected: false
    })

    recording
    actionsRecord

    socketActionManager

    constructor(server, path, options, arSessionManager=null) {
        options.path = path
        this.socket = io(server, options)
        if(arSessionManager)
            this.socketActionManager = new SocketActionManager(arSessionManager)

        this.socket.on('connect', () => {
            this.state.connected = true
        })
        this.socket.on('disconnect', () => {
            this.state.connected = false
        })

        this.recording = ref(false)
        this.actionsRecord = []

        this.socket.onAny((event, payload) => this.handleActionManager(event, payload))
    }

    send(event, payload, callback = null) {
        if(this.recording) {
            this.actionsRecord.push({event, payload})
        } else {
            if(callback)
                this.socket.emit(event, payload, callback)
            else
                this.socket.emit(event, payload)
        }

        this.handleActionManager(event, payload)
    }

    addListener(event, handler) {
        this.socket.on(event, handler)
    }

    handleActionManager(event, payload) {
        if(!this.socketActionManager) return

        if(event.startsWith("presentation:action:")) {
            const eventName = event.replace("presentation:action:", "")
            if (
                Object.getOwnPropertyNames(Object.getPrototypeOf(this.socketActionManager)).includes(eventName) &&
                typeof this.socketActionManager[eventName] === 'function'
            )
                this.socketActionManager[eventName](payload)
            else
                console.error("SocketActionManager : event "+eventName+" not found")
        }
    }

    startRecording() {
        this.actionsRecord = []
        this.recording = true

        this.send("presentation:action:reset")
    }

    stopRecording() {
        const res = [...this.actionsRecord]
        this.recording = false
        this.send("presentation:action:reset")
        return res
    }
}