import {destroyPresentation, presentations} from "./index.js";

export function createPresentation(socket, data, callback) {

    if(!socket.auth)
        return callback({success: false, message: "Unauthorized"})

    const roomId = "presentation-" + socket.auth.id

    if(presentations[roomId])
        destroyPresentation(roomId)

    const recordUser = !!data?.recordUser


    presentations[roomId] = {
        host: socket.id,
        viewers: [],
        actions: [],
        project: data.projectId,
        recordUser,
    }
    socket.join(roomId)
    socket.roomCode = roomId

    callback({success: true, message: "Created", id: roomId, recordUser})
}