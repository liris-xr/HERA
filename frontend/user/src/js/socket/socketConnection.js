import {io} from "socket.io-client";
import {reactive, ref, toRaw} from "vue";
import {SocketActionManager} from "@/js/socket/socketActionManager.js";

export class SocketConnection {
    socket
    state = reactive({
        connected: false
    })

    recording
    actionsRecord

    socketActionManager
    actionQueue

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
        this.actionQueue = Promise.resolve()

        this.socket.onAny((event, ...args) => this.queueActionManager(event, ...args))
    }

    send(event, ...args) {
        if(this.recording) {
            this.actionsRecord.push({event, args})
        } else {
            this.socket.emit(event, ...args)
        }

        this.queueActionManager(event, ...args)
    }

    addListener(event, handler) {
        this.socket.on(event, handler)
    }

    queueActionManager(event, ...args) {
        if(!event.startsWith("presentation:action:")) {
            return this.handleActionManager(event, ...args)
        }

        const run = () => this.handleActionManager(event, ...args)
            .catch((e) => console.error("[SocketConnection] action failed", event, e))

        this.actionQueue = this.actionQueue.then(run, run)
        return this.actionQueue
    }

    async handleActionManager(event, ...args) {
        if(!this.socketActionManager) return
        const socketActionManager = toRaw(this.socketActionManager)

        if(event.startsWith("presentation:action:")) {
            const eventName = event.replace("presentation:action:", "")
            if (
                Object.getOwnPropertyNames(Object.getPrototypeOf(socketActionManager)).includes(eventName) &&
                typeof socketActionManager[eventName] === 'function'
            )
                await socketActionManager[eventName](...args)
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
