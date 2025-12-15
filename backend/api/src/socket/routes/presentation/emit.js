import {presentations} from "./index.js";
import {ioInstance} from "../../index.js";

export function emitInPresentation(socket, data, callback) {

    if(!socket.auth)
        return callback({success: false, message: "Unauthorized"})

    const room = presentations[socket.roomCode]

    if(room.host !== socket.id)
        return callback({success: false, message: "Unauthorized"})

    ioInstance.to(socket.roomCode).except(socket.id).emit("presentation:emit", data);
    return callback({success: true})

}