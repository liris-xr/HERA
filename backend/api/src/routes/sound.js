import express from 'express'
import {baseUrl} from "./baseUrl.js";
import {ArProject, ArScene, ArSound} from "../orm/index.js";
import authMiddleware from "../middlewares/auth.js";
import {Op} from "sequelize";
import {adminUploadSound, deleteSound, uploadSound} from "../utils/fileUpload.js";

const router = express.Router()

// routes pour le mode admin

const SOUNDS_PAGE_LENGTH = 10;

router.get(baseUrl+'admin/sounds/:page?', authMiddleware, async (req, res) => {
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


        const { count, rows } = await ArSound.findAndCountAll({
            subQuery: false,
            attributes: ["id", "name"],
            limit: SOUNDS_PAGE_LENGTH,
            offset: (page - 1) * SOUNDS_PAGE_LENGTH,
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
            sounds: rows,
            totalPages: Math.ceil(count / SOUNDS_PAGE_LENGTH),
            currentPage: page,
        });
    } catch (e){
        console.log(e);
        res.status(400);
        return res.send({error: 'Unable to fetch sounds'});
    }
})

router.delete(baseUrl+"admin/sounds/:soundId", authMiddleware, async (req, res) => {
    const authUser = req.user
    const soundId = req.params.soundId

    if(!authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const sound = await ArSound.findOne({
            where: {id: soundId},
        })

        await deleteSound(sound)
        await sound.destroy()

        return res.status(200).send()
    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to delete sound'});
    }
})

router.put(baseUrl+"admin/sounds/:soundId", authMiddleware, async (req, res) => {
    const authUser = req.user
    const soundId = req.params.soundId

    if(!authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const sound = await ArSound.findOne({
            where: {id: soundId},
        })

        await sound.update({
            name: req.body?.name,
            isLoopingEnabled: req.body?.isLoopingEnabled || false,
            playOnStartup: req.body?.playOnStartup || false,
            volumeLevel: req.body?.volumeLevel || 0.5
        }, {
            returning: true
        })

        return res.status(200).send(sound)

    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to save sound'});
    }
})

router.post(baseUrl+"admin/sounds", authMiddleware, adminUploadSound.single("sound"), async (req, res) => {
    const authUser = req.user;

    if(!authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' });
    }

    try {
        const fileUrl = req.uploadedFilenames[0];

        console.log(req.body)

        const newSound = await ArSound.create({
            name: req.body.name,
            url: fileUrl,
            sceneId: req.body.sceneId,
            playOnStartup: req.body.playOnStartup || false,
            isLoopingEnabled: req.body.isLoopingEnabled || false,
            volumeLevel: req.body.volumeLevel || 0.5
        })

        res.set({
            'Content-Type': 'application/json'
        });
        res.status(200);
        return res.send(newSound);

    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to save sound'});
    }



})

export default router
