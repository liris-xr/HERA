import {destroyPresentation, presentations} from "./index.js";

export function createPresentation(socket, data, callback) {
    const roomId = "presentation-" + socket.id

    if(!socket.auth)
        return callback({success: false, message: "Unauthorized"})

    if(presentations[roomId])
        destroyPresentation(roomId)

    presentations[roomId] = {
        host: socket.id,
        viewers: [],
        project: data.projectId
    }
    socket.join(roomId)

    callback({success: true, message: "Created", id: roomId})

    console.log(presentations[roomId])
}