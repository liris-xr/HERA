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

export function leaveAllPresentations(socket) {
    for(const room of socket.rooms) {
        if(room !== socket.id) {
            if(room in presentations) {
                const index = presentations[room].viewers.findIndex((v) => v.id === socket.id)
                presentations[room].viewers.splice(index, 1)
            }
            socket.leave(room)
        }
    }
}

//TODO intervalle pour supprimer les présentations inactives