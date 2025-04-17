import { ArUser } from '../orm/index.js'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../consts/secret.js'
import express from 'express'
import { getDetails } from '../validators/index.js'
import {baseUrl} from "./baseUrl.js";
import authMiddleware from "../middlewares/auth.js";

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
        const { username, email, password } = reqBody

        // Vérifier si l'utilisateur existe déjà
        const userWithSameEmail = await ArUser.findOne({ where: { email }})

        if (userWithSameEmail) {
            return res.status(409).json({ error: 'E-mail already used' })
        }

        // Créer le nouvel utilisateur
        const newUser = await ArUser.create({
            username,
            email,
            password
        })

        // Générer un token JWT pour l'authentification future
        const payload = {
            id: newUser.id,
            username,
            email,
        }

        const token = jwt.sign(payload, JWT_SECRET)

        // Renvoyer l'utilisateur et le token
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
        // Vérifier si l'utilisateur existe
        const user = await ArUser.findOne({
            where: { email }
        })

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }


        // Vérifier le mot de passe de l'utilisateur
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials.' })
        }

        // Générer un token JWT pour l'authentification future
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email,
            admin: user.admin
        }
        const token = jwt.sign(payload, JWT_SECRET)

        // Renvoyer le token
        res.status(200).json({ access_token: token })
    } catch (e) {
        res.status(401).json({ error: 'Invalid credentials', details: getDetails(e) })
    }
})

export default router
