import {ioInstance} from "../../index.js";

export const presentations = {}

export function destroyPresentation(id) {
    if(!(id in presentations)) return

    const presentation = presentations[id];

    console.log(presentation)

    for (const viewer of presentation.viewers) {
        const socket = ioInstance.sockets.sockets.get(viewer)
        socket?.emit("presentation:terminated", {message: "presentation " + id + " has ended"})
        socket?.leave(id)
    }

    const socket = ioInstance.sockets.sockets.get(presentation.host);
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