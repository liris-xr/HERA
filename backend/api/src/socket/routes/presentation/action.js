import {ioInstance} from "../../index.js";
import {presentations} from "./index.js";

export function actionInPresentation(socket, event, ...args) {

    if(!event.startsWith("presentation:action:"))
        return

    const callback = args[args.length-1]

    if(!socket.auth)
        return callback({success: false, message: "Unauthorized"})

    presentations[socket.roomCode].actions.push({event, args})

    ioInstance.to(socket.roomCode).except(socket.id).emit(event, ...args)


}