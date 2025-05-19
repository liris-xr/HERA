import {destroyPresentation, presentations} from "./index.js";

export function terminatePresentation(socket, callback) {

    if(!socket.auth)
        return callback({success: false, message: "Unauthorized"})

    const roomId = "presentation-" + socket.auth.id

    if(presentations[roomId])
        destroyPresentation(roomId)

    callback({success: true, message: "terminated"})
}