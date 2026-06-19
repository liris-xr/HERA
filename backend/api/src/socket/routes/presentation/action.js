import {ioInstance} from "../../index.js";
import {presentations} from "./index.js";

export function actionInPresentation(socket, event, ...args) {

    if(!event.startsWith("presentation:action:"))
        return

    const maybeCallback = args[args.length-1]
    const callback = typeof maybeCallback === "function" ? maybeCallback : null
    const actionArgs = callback ? args.slice(0, -1) : args

    if(!socket.auth)
        return callback?.({success: false, message: "Unauthorized"})

    const room = presentations[socket.roomCode]
    if(!room)
        return callback?.({success: false, message: "Presentation not found"})

    if(room.host !== socket.id)
        return callback?.({success: false, message: "Unauthorized"})

    room.actions.push({event, args: actionArgs})

    ioInstance.to(socket.roomCode).except(socket.id).emit(event, ...actionArgs)
    callback?.({success: true})


}
