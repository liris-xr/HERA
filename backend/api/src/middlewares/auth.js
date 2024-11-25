import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../consts/secret.js'
/**
 * Middleware function type import
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * Middleware for authentification
 * @type {RequestHandler}
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized', details: 'Missing token' })
    }

    jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
        if (err) {
            return res.status(401).json({ error: 'Unauthorized', details: 'Invalid token' })
        }

        req.user = decodedToken
        next()
    })
}

export default authMiddleware
