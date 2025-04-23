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

router.put(baseUrl+"admin/assets/:assetId", authMiddleware, async (req, res) => {
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

        await asset.update({
            name: req.body?.name,
            hideInViewer: req.body?.hideInViewer,
        }, {
            returning: true
        })

        return res.status(200).send(asset)

    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to save asset'});
    }
})

export default router
