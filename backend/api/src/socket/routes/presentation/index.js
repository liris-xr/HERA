import {ioInstance} from "../../index.js";

export const presentations = {}

export function destroyPresentation(id) {
    if(!(id in presentations)) return

    const presentation = presentations[id];

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
    const roomCode = socket.roomCode;
    const room = presentations[roomCode]

    if(!room) return

    if (room.host === socket.id) {
        socket.roomCode = undefined
        destroyPresentation(roomCode)
        return
    }

    const index = room.viewers.findIndex((viewerId) => viewerId === socket.id)
    if (index !== -1) {
        room.viewers.splice(index, 1)
    }

    sendUserCount(roomCode)
    socket.leave(roomCode)

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
