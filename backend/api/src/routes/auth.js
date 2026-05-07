import { ArUser } from '../orm/index.js'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../consts/secret.js'
import express from 'express'
import { getDetails } from '../validators/index.js'
import {baseUrl} from "./baseUrl.js";
import authMiddleware from "../middlewares/auth.js";
import {passwordHash, passwordVerify} from "../utils/passwordHash.js";

const router = express.Router()

/**
 * @typedef {object} RegisterRequestBody
 * @property {string} username
 * @property {string} email
 * @property {string} password
 */

router.post(baseUrl+'auth/register', authMiddleware, async (req, res) => {
    try {
        const user = req.user

        if(!user.admin) {
            res.status(401);
            return res.send({ error: 'Unauthorized', details: 'User not granted' })
        }

        const reqBody = req.body
        const { username, email, unhashedPassword } = reqBody

        const password = await passwordHash(unhashedPassword)

        // check if user exists
        const userWithSameEmail = await ArUser.findOne({ where: { email }})

        if (userWithSameEmail) {
            return res.status(409).json({ error: 'E-mail already used' })
        }

        // create user
        const newUser = await ArUser.create({
            username,
            email,
            password
        })

        // generate token
        const payload = {
            id: newUser.id,
            username,
            email,
        }

        const token = jwt.sign(payload, JWT_SECRET)

        // return user and token
        res.status(201).json({ access_token: token })
    } catch (e) {
        console.log(e)
        res.status(400).json({ error: 'Invalid or missing information', details: getDetails(e) })
    }
})



/**
 * @typedef {object} LoginRequestBody
 * @property {string} email
 * @property {string} password
 */

router.post(baseUrl+'auth/login', async (req, res) => {
    const reqBody = req.body
    const { email, password } = reqBody

    try {
        // check user
        const user = await ArUser.findOne({
            where: { email }
        })

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }


        // verify password
        if (!(await passwordVerify(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials.' })
        }

        // generate token
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email,
            admin: user.admin
        }
        const token = jwt.sign(payload, JWT_SECRET)

        // return token
        res.status(200).json({ access_token: token })
    } catch (e) {
        res.status(401).json({ error: 'Invalid credentials', details: getDetails(e) })
    }
})

export default router
