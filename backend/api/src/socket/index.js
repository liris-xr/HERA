import socketAuthMiddleware from "./middlewares/socketAuth.js";
import safeHandler from "./utils/safeHandler.js"
import {createPresentation} from "./routes/presentation/create.js";

export default function setupSocket(io) {
    console.log("setup socket");
    io.use(socketAuthMiddleware)

    io.on("connection", (socket) => {
        console.log(socket)
        initConnection(socket)
        setupSocketEvents(io, socket)
    })
    console.log("setup socket done");
}

function initConnection(socket) {
    console.log("Client", socket.id, "connected");
}

function setupSocketEvents(io, socket) {
    socket.on("presentation:create", (callback) => safeHandler(createPresentation)(io, socket, callback))

}