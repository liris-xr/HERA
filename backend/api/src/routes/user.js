import express from 'express'
import {baseUrl} from "./baseUrl.js";
import {ArAsset, ArLabel, ArProject, ArScene, ArUser} from "../orm/index.js";
import {sequelize} from "../orm/database.js";
import authMiddleware from "../middlewares/auth.js";
import {passwordHash} from "../utils/passwordHash.js";
import {Op} from "sequelize";

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


    if(project == null) {
        res.status(404);
        return res.send({ error: 'Unable to find project'});
    }
    
    if(userId !== project.owner.id && !req.user.admin){
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    res.status(200);
    return res.send(project);

})

// uniquement pour changer le mdp
router.put(baseUrl+"users/:userId", authMiddleware, async (req, res) => {
    const authUser = req.user
    const userId = req.params.userId;

    if(userId !== authUser.id && !authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    if(!req.body.password || req.body.password?.length < 8) {
        return res.status(400).send({ error: 'Password\'s length must be >= 8'});
    }

    try {

        const user = await ArUser.findOne({
            where: {id: userId},
        })

        await user.update({
            password: passwordHash(req.body.password)
        }, {
            returning: true
        })

        return res.status(200).send()

    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to save user'});
    }
})


// routes pour le mode admin

const USERS_PAGE_LENGTH = 10;

router.get(baseUrl+'admin/users/:page?', authMiddleware, async (req, res) => {
    const user = req.user
    const page = parseInt(req.params.page) || 1

    if(!user.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const where = {}

        if(req.query?.username)
            where.username = {
                [Op.like]: `%${req.query?.username}%`
            }
        if(req.query?.email)
            where.email = {
                [Op.like]: `%${req.query?.email}%`
            }


        const { count, rows } = await ArUser.findAndCountAll({
            attributes: ["username", "id", "email", "admin"],
            limit: USERS_PAGE_LENGTH,
            offset: (page - 1) * USERS_PAGE_LENGTH,
            order: [['createdAt', 'ASC']],
            where
        });

        res.status(200);
        res.send({
            users: rows,
            totalPages: Math.ceil(count / USERS_PAGE_LENGTH),
            currentPage: page,
        });
    } catch (e){
        console.log(e);
        res.status(400);
        return res.send({error: 'Unable to fetch users'});
    }

})

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


export default router
