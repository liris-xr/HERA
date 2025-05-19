import express from 'express'
import {baseUrl} from "./baseUrl.js";
import {ArAsset, ArLabel, ArProject, ArScene, ArUser} from "../orm/index.js";
import {sequelize} from "../orm/database.js";
import authMiddleware from "../middlewares/auth.js";
import {passwordHash} from "../utils/passwordHash.js";
import {Op} from "sequelize";

const router = express.Router()

// routes pour le mode admin

const LABELS_PAGE_LENGTH = 10;

router.get(baseUrl+'admin/labels/:page?', authMiddleware, async (req, res) => {
    const user = req.user
    const page = parseInt(req.params.page) || 1

    if(!user.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const where = {}
        const whereProject = {}

        if(req.query?.text)
            where.text = {
                [Op.like]: `%${req.query?.text}%`
            }
        if(req.query["scene.project.title"])
            whereProject.title = {
                [Op.like]: `%${req.query["scene.project.title"]}%`
            }


        const { count, rows } = await ArLabel.findAndCountAll({
            subQuery: false,
            attributes: ["id", "text", "timestampStart", "timestampEnd"],
            limit: LABELS_PAGE_LENGTH,
            offset: (page - 1) * LABELS_PAGE_LENGTH,
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
            labels: rows,
            totalPages: Math.ceil(count / LABELS_PAGE_LENGTH),
            currentPage: page,
        });
    } catch (e){
        console.log(e);
        res.status(400);
        return res.send({error: 'Unable to fetch labels'});
    }
})

router.delete(baseUrl+"admin/labels/:labelId", authMiddleware, async (req, res) => {
    const authUser = req.user
    const labelId = req.params.labelId

    if(!authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const label = await ArLabel.findOne({
            where: {id: labelId},
        })

        await label.destroy()

        return res.status(200).send()
    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to delete label'});
    }
})

router.put(baseUrl+"admin/labels/:labelId", authMiddleware, async (req, res) => {
    const authUser = req.user
    const labelId = req.params.labelId

    if(!authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const label = await ArLabel.findOne({
            where: {id: labelId},
        })

        await label.update({
            text: req.body?.text,
            timestampStart: req.body?.timestampStart,
            timestampEnd: req.body?.timestampEnd
        }, {
            returning: true
        })

        return res.status(200).send(label)

    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to save label'});
    }
})

router.post(baseUrl+"admin/labels", authMiddleware, async (req, res) => {
    const authUser = req.user

    if(!authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const scene = await ArScene.findOne({
            where: {
                id: req.body.sceneId
            }
        })

        if(!scene) {
            res.status(404);
            return res.send({ error: 'Scene not found' })
        }

        let newLabel = await ArLabel.create({
            text: req.body.text,
            timestampStart: req.body?.timestampStart,
            timestampEnd: req.body?.timestampEnd,
            sceneId: req.body.sceneId,
        })

        res.set({
            'Content-Type': 'application/json'
        });
        res.status(200);
        return res.send(newLabel);

    }catch (e){
        console.log(e);
        res.status(400);
        return res.send({ error: 'Unable to create label'});
    }











})

export default router
