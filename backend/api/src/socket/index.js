import socketAuthMiddleware from "./middlewares/socketAuth.js";
import safeHandler from "./utils/safeHandler.js"
import {createPresentation} from "./routes/presentation/create.js";
import {leavePresentation} from "./routes/presentation/index.js";
import {joinPresentation} from "./routes/presentation/join.js";
import {emitInPresentation} from "./routes/presentation/emit.js";
import {actionInPresentation} from "./routes/presentation/action.js";

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
        leavePresentation(socket)
        console.log("Client", socket.id, "disconnected");
    })
}

function setupSocketEvents(socket) {
    socket.on("presentation:create", (data, callback) => safeHandler(createPresentation)(socket, data, callback))
    socket.on("presentation:join", (data, callback) => safeHandler(joinPresentation)(socket, data, callback))
    socket.on("presentation:emit", (data, callback) => safeHandler(emitInPresentation)(socket, data, callback))
    socket.onAny((event, ...args) => safeHandler(actionInPresentation)(event, ...args))
}

