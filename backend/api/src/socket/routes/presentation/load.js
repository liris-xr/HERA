import {destroyPresentation, presentations} from "./index.js";

export function loadPresentation(socket) {

    if(!socket.roomCode)
        return

    const room = presentations[socket.roomCode]
    if(!room)
        return

    for(let action of room.actions)
        socket.emit(action.event, ...action.args)

}