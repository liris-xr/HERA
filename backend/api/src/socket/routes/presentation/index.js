import {ioInstance} from "../../index.js";

export const presentations = {}

export function destroyPresentation(id) {
    if(!(id in presentations)) return

    for (const viewer in presentations) {
        const socket = ioInstance.sockets.sockets.get(viewer)
        socket?.emit("terminated", {message: "presentation " + id + " has been ended"})
        socket?.leave(id)
    }

    const socket = ioInstance.sockets.sockets.get(presentations[id].host);
    socket?.leave(id)

    delete presentations[id]
}

export function leavePresentation(socket) {
    const room = presentations[socket.roomCode]

    if(!room) return

    const index = room.viewers.findIndex((v) => v.id === socket.id)
    room.viewers.splice(index, 1)

    sendUserCount(socket.roomCode)
    socket.leave(room)

    socket.roomCode = undefined
}

export function sendUserCount(presentationId) {
    if(presentationId in presentations) {
        const presentation = presentations[presentationId]

        const socket = ioInstance.sockets.sockets.get(presentation.host)
        socket?.emit("presentation:userCount", presentation.viewers.length)
    }
}

//TODO intervalle pour supprimer les présentations inactives