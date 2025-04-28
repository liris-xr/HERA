import {io} from "socket.io-client";
import {reactive} from "vue";

export class SocketConnection {
    socket
    state = reactive({
        connected: false
    })

    constructor(server, path, options) {
        options.path = path
        this.socket = io(server, options)

        this.socket.on('connect', () => {
            this.state.connected = true
        })
    }
}