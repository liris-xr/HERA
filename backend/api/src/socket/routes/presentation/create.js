import {destroyPresentation, presentations} from "./index.js";

export function createPresentation(socket, data, callback) {

    if(!socket.auth)
        return callback({success: false, message: "Unauthorized"})

    const roomId = "presentation-" + socket.auth.id

    if(presentations[roomId])
        destroyPresentation(roomId)

    presentations[roomId] = {
        host: socket.id,
        viewers: [],
        project: data.projectId
    }
    socket.join(roomId)
    socket.roomCode = roomId

    callback({success: true, message: "Created", id: roomId})
}