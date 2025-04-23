import express from 'express'
import {baseUrl} from "./baseUrl.js";
import {ArAsset, ArLabel, ArProject, ArScene, ArUser} from "../orm/index.js";
import {sequelize} from "../orm/database.js";
import authMiddleware from "../middlewares/auth.js";
import {passwordHash} from "../utils/passwordHash.js";
import {Op} from "sequelize";

const router = express.Router()

// routes pour le mode admin

const ASSETS_PAGE_LENGTH = 10;

router.get(baseUrl+'admin/assets/:page?', authMiddleware, async (req, res) => {
    const user = req.user
    const page = parseInt(req.params.page) || 1

    if(!user.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const where = {}
        const whereProject = {}

        if(req.query?.name)
            where.name = {
                [Op.like]: `%${req.query?.name}%`
            }
        if(req.query["scene.project.title"])
            whereProject.title = {
                [Op.like]: `%${req.query["scene.project.title"]}%`
            }


        const { count, rows } = await ArAsset.findAndCountAll({
            subQuery: false,
            attributes: ["id", "name", "hideInViewer"],
            limit: ASSETS_PAGE_LENGTH,
            offset: (page - 1) * ASSETS_PAGE_LENGTH,
            order: [['createdAt', 'ASC']],
            include: [{
                model: ArScene,
                as: "scene",
                required: true,
                include: [{
                    model: ArProject,
                    as: "project",
                    where: whereProject,
                    required: true,
                }]
            }],
            where
        });

        res.status(200);
        res.send({
            assets: rows,
            totalPages: Math.ceil(count / ASSETS_PAGE_LENGTH),
            currentPage: page,
        });
    } catch (e){
        console.log(e);
        res.status(400);
        return res.send({error: 'Unable to fetch assets'});
    }
})

router.delete(baseUrl+"admin/assets/:assetId", authMiddleware, async (req, res) => {
    const authUser = req.user
    const assetId = req.params.assetId

    if(!authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const asset = await ArAsset.findOne({
            where: {id: assetId},
        })

        await asset.destroy()

        return res.status(200).send()
    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to delete asset'});
    }
})

/*
router.put(baseUrl+"admin/users/:userId", authMiddleware, async (req, res) => {
    const authUser = req.user
    const userId = req.params.userId;

    if(!authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {

        const user = await ArUser.findOne({
            where: {id: userId},
        })

        await user.update({
            username: req.body?.username,
            email: req.body?.email,
            admin: req.body?.admin
        }, {
            returning: true
        })

        return res.status(200).send(user)

    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to save user'});
    }
})

router.delete(baseUrl+"admin/users/:userId", authMiddleware, async (req, res) => {
    const authUser = req.user
    const userId = req.params.userId;

    if(!authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const user = await ArUser.findOne({
            where: {id: userId},
        })

        await user.destroy()

        return res.status(200).send()
    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to delete user'});
    }
})

router.post(baseUrl+"admin/users", authMiddleware, async (req, res) => {
    const authUser = req.user

    if(!authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {

        const password = passwordHash(req.body.password)

        const newUser = await ArUser.create({
            username: req.body.username,
            email: req.body.email,
            password: password,
            admin: req.body?.admin,
        })

        newUser.password = undefined
        const totalPages = Math.ceil(await ArUser.count() / USERS_PAGE_LENGTH)

        res.set({
            'Content-Type': 'application/json'
        });
        res.status(200);
        return res.send({
            user: newUser,
            redirectPage: totalPages,
        });

    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to create user'});
    }
})
*/


export default router
