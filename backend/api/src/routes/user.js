import express from 'express'
import {baseUrl} from "./baseUrl.js";
import {ArAsset, ArLabel, ArProject, ArScene, ArUser} from "../orm/index.js";
import {sequelize} from "../orm/database.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router()

const PAGE_LENGTH = 20;

/**
 * Route to fetch all projects of a user (published or not)
 */
router.get(baseUrl+'users/:userId/projects/:page', authMiddleware , async (req, res) => {
    const page = parseInt(req.params.page);
    const userId = req.params.userId;
    const token = req.user
    try{
        let projects = await ArProject.findAll({
            subQuery:false,
            attributes: [
                "id",
                "title",
                "pictureUrl",
                "updatedAt",
                "published",
                [
                    sequelize.fn('COUNT', sequelize.col('scenes.id')), 'sceneCount'
                ]
            ],
            include: [
                {
                    model: ArScene,
                    as: "scenes",
                    attributes: [],
                }
            ],
            where: { userId: userId },
            group: ['ArProject.id'],
            limit: PAGE_LENGTH,
            offset: page * PAGE_LENGTH,
            order: [['updatedAt', 'DESC']],
        });



        res.set({
            'Content-Type': 'application/json'
        });

        if(token.id !== userId && !req.user.admin){
            res.status(401);
            return res.send({ error: 'Unauthorized', details: 'User not granted' })
        }

        if(projects == null){
            res.status(404);
            return res.send({ error: 'Unable to fetch user projects'});
        }else{
            res.status(200);
            return res.send(projects);
        }
    }catch (e){
        console.log(e);
        res.status(400);
        return res.send({error: 'Unexpected error'});
    }

})




/**
 * Route to fetch a single project detail for a specific user (require auth)
 */
router.get(baseUrl+'users/:userId/project/:projectId', authMiddleware, async (req, res) => {
    const userId = req.params.userId;
    const projectId = req.params.projectId;

    let project = (await ArProject.findOne({
            where: {id: projectId },
            include:[
                {
                    model: ArScene,
                    as: "scenes",
                    include:[
                        {
                            model: ArAsset,
                            as: "assets",
                        },
                        {
                            model: ArLabel,
                            as: "labels",
                        },
                    ],
                    separate: true,
                    order: [['index', 'ASC']],


                },

                {
                    model: ArUser,
                    as: "owner",
                    attributes: ["username", "id"],
                }

            ],
        })
    )
    res.set({
        'Content-Type': 'application/json'
    })

    if(userId !== project.owner.id && !req.user.admin){
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    if(project == null) {
        res.status(404);
        res.send({ error: 'Unable to find project'});
    } else {
        res.status(200);
        res.send(project);
    }
})



// routes pour le mode admin

router.get(baseUrl+'users', authMiddleware, async (req, res) => {
    const user = req.user

    if(!user.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    const users = await ArUser.findAll({attributes: ["username", "id", "email", "admin"]});
    res.status(200);
    res.send(users);
})

router.put(baseUrl+"users/:userId", authMiddleware, async (req, res) => {
    const authUser = req.user
    const userId = req.params.userId;

    if(authUser.id !== userId && !authUser.admin) {
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
            admin: authUser.admin ? req.body?.admin : undefined,
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

router.delete(baseUrl+"users/:userId", authMiddleware, async (req, res) => {
    const authUser = req.user
    const userId = req.params.userId;

    if(authUser.id !== userId && !authUser.admin) {
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


export default router
