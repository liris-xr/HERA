import {presentations, sendUserCount} from "./index.js";

export function joinPresentation(socket, code, callback) {
    if(code in presentations) {
        socket.join(code)
        socket.roomCode = code

        presentations[code].viewers.push(socket.id)
        sendUserCount(code)

        callback({success: true, presentation: presentations[code] })

        for(let action of presentations[code].actions)
            socket.emit(action.event, ...action.args)
    } else
        callback({success: false, message: "Presentation not found"})
}