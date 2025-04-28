import socketAuthMiddleware from "./middlewares/socketAuth.js";
import safeHandler from "./utils/safeHandler.js"
import {createPresentation} from "./routes/presentation/create.js";

export default function setupSocket(io) {
    io.use(socketAuthMiddleware)

    io.on("connection", (socket) => {
        console.log(socket)
        initConnection(socket)
        setupSocketEvents(io, socket)
    })
}

function initConnection(socket) {
    console.log("Client", socket.id, "connected");
}

function setupSocketEvents(io, socket) {
    socket.on("presentation:create", (callback) => safeHandler(createPresentation)(io, socket, callback))

}