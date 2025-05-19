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

        this.socket.onAny((event, ...args) => this.handleActionManager(event, ...args))
    }

    send(event, ...args) {
        if(this.recording) {
            this.actionsRecord.push({event, args})
        } else {
            this.socket.emit(event, ...args)
        }

        this.handleActionManager(event, ...args)
    }

    addListener(event, handler) {
        this.socket.on(event, handler)
    }

    handleActionManager(event, ...args) {
        if(!this.socketActionManager) return

        if(event.startsWith("presentation:action:")) {
            const eventName = event.replace("presentation:action:", "")
            if (
                Object.getOwnPropertyNames(Object.getPrototypeOf(this.socketActionManager)).includes(eventName) &&
                typeof this.socketActionManager[eventName] === 'function'
            )
                this.socketActionManager[eventName](...args)
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