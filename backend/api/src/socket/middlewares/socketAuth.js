import {JWT_SECRET} from "../../consts/secret.js";
import jwt from "jsonwebtoken";

export default function socketAuthMiddleware(socket, next) {
    const token = socket?.handshake?.auth?.token

    if(token) {
        try {
            const data = jwt.verify(token.split(" ")[1], JWT_SECRET)
            socket.auth = data
        } catch(e) {
            console.log(e)
        }
    }

    next()
}