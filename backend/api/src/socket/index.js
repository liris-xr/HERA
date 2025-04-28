import socketAuthMiddleware from "./middlewares/socketAuth.js";
import safeHandler from "./utils/safeHandler.js"
import {createPresentation} from "./routes/presentation/create.js";
import {leaveAllPresentations} from "./routes/presentation/index.js";

export let ioInstance = null;

export default function setupSocket(io) {
    ioInstance = io

    io.use(socketAuthMiddleware)

    io.on("connection", (socket) => {
        initConnection(socket)
        setupSocketEvents(socket)
    })
}

function initConnection(socket) {
    console.log("Client", socket.id, "connected");

    socket.on("disconnect", () => {
        leaveAllPresentations(socket)
    })
}

function setupSocketEvents(socket) {
    socket.on("presentation:create", (data, callback) => safeHandler(createPresentation)(socket, data, callback))

}