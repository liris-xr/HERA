import express from 'express'
import {baseUrl} from "./baseUrl.js";
import {ArAsset, ArLabel, ArProject, ArScene, ArUser} from "../orm/index.js";
import {sequelize} from "../orm/database.js";
import authMiddleware from "../middlewares/auth.js";
import {
    deleteFile,
    deleteFolder,
    duplicateFolder,
    getProjectDirectory,
    getUpdatedPath,
    uploadCover
} from "../utils/fileUpload.js";


const router = express.Router()

const PAGE_LENGTH = 20;

router.get(baseUrl+'projects/:page', async (req, res) => {
    const page = parseInt(req.params.page);
    try{
        let projects = (await ArProject.findAll({
            subQuery: false,
            attributes: [
                "id",
                "title",
                "pictureUrl",
                "updatedAt",
                [sequelize.fn('COUNT', sequelize.col('scenes.id')), 'sceneCount'],
            ],
            include: [
                {
                    model: ArScene,
                    as: "scenes",
                    attributes: []
                },
                {
                    model: ArUser,
                    as: "owner",
                    attributes: ["username"],
                }
            ],
            where: {published:true},
            group: ['ArProject.id'],
            limit: PAGE_LENGTH,
            offset: page * PAGE_LENGTH,
            order: [['updatedAt', 'DESC']],

        }));
        res.set({
            'Content-Type': 'application/json'
        });

        if(projects == null){
            res.status(404);
            return res.send({ error: 'Unable to fetch projects'});
        }else{
            res.status(200);
            return res.send(projects);
        }
    }catch (e){
        console.log(e);
        res.status(400);
        return res.send({error: 'Incorrect query parameter : page'});
    }

})



router.get(baseUrl+'project/:projectId', async (req, res) => {
    let project = (await ArProject.findOne({
            where: { published: true, id: req.params.projectId },
            include:[
                {
                    model: ArScene,
                    as: "scenes",
                    separate: true,
                    order: [['index', 'ASC']],
                    include:[
                        {
                            model: ArAsset,
                            as: "assets",
                            where:{
                                hideInViewer: false
                            },
                            required:false
                        },
                        {
                            model: ArLabel,
                            as: "labels",
                        },
                    ],
                },

                {
                    model: ArUser,
                    as: "owner",
                    attributes: ["username"],
                }

            ],
        })
    )
    res.set({
        'Content-Type': 'application/json'
    })

    if(project == null){
        res.status(404);
        res.send({ error: 'Unable to find project'});
    }else{
        res.status(200);
        res.send(project);

    }
})






router.put(baseUrl+'projects/:projectId', authMiddleware, uploadCover.single('uploadedCover'), async (req, res) => {
    let token = req.user
    let projectId = req.params.projectId
    let uploadedUrl = req.uploadedUrl;

    try {


        let project = await ArProject.findOne({
            where: {id: projectId},
        })

        if (project == null)
            return res.status(404).send({error: 'Project not found'})

        if (project.userId != token.id)
            return res.status(403).send({error: "User not granted"})



        let updatedUrl = req.body.pictureUrl;
        if(uploadedUrl){
            deleteFile(req.body.pictureUrl);
            updatedUrl = uploadedUrl
        }

        await project.update({
            published: req.body.published,
            title: req.body.title,
            description: req.body.description,
            pictureUrl: updatedUrl,
            unit: req.body.unit,
            calibrationMessage: req.body.calibrationMessage,
            userId: token.id,
        }, {
            returning: true
        })


        let currentIndex = 0;
        for (let scene of JSON.parse(req.body.scenes)) {
            await ArScene.update({
                index:currentIndex,
            },{
                where: {id: scene.id},
            });
            currentIndex++;
        }


        return res.status(200).send(project)
    }catch (e){
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to save project'});
    }
})



router.post(baseUrl+'project', authMiddleware, async (req, res) => {
    const token = req.user
    try{

        let newProject = await ArProject.create({
            title: req.body.title,
            description: req.body.description,
            unit: req.body.unit,
            calibrationMessage: req.body.calibrationMessage,
            userId: token.id,
        });

        res.set({
            'Content-Type': 'application/json'
        });
        res.status(200);
        return res.send(newProject);

    }catch (e){
        console.log(e);
        res.status(400);
        return res.send({ error: 'Unable to create project'});
    }
})




router.delete(baseUrl+'project/:projectId', authMiddleware, async (req, res) => {
    const token = req.user
    const projectId = req.params.projectId
    try{
        let project = await ArProject.findOne({
            include:[
                {
                    model: ArUser,
                    as: "owner",
                    attributes: ["id"]
                }
            ],
            where: {id: projectId},
        })

        res.set({
            'Content-Type': 'application/json'
        });

        if(project == null){
            return res.status(404).send({error: 'Project not found'})
        }

        if(project.owner.id != token.id)
            return res.status(403).send({error: 'User not granted'})


        await project.destroy();

        await deleteFolder(getProjectDirectory(projectId));

        res.status(200);
        return res.send();

    }catch (e){
        console.log(e);
        res.status(400);
        return res.send({ error: 'Unable to delete project'});
    }
})





router.post(baseUrl+'project/:projectId/copy', authMiddleware, async (req, res) => {
    const token = req.user
    const projectId = req.params.projectId;

    try {

        const project = await ArProject.findOne({
            where: { id: projectId },
            include:[
                {
                    model: ArScene,
                    as: "scenes",
                    include: [
                        {
                            model: ArAsset,
                            as: 'assets'
                        },
                        {
                            model: ArLabel,
                            as: 'labels'
                        },
                    ]
                },
                {
                    model: ArUser,
                    as: "owner",
                    attributes: ["id"]
                }
            ]
        });

        res.set({
            'Content-Type': 'application/json'
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if(project.owner.id != token.id){
            return res.status(403).send({error: 'User not granted'});
        }

        await sequelize.transaction(async (t) => {
            //copy the project
            const newProject = await ArProject.create({
                ...project.get({ plain: true }),
                id: undefined,
                title: req.body.newTitle,
                published: false,
            },{
                transaction: t
            });



            //copy all scenes related to project
            const newScenes = await Promise.all(project.scenes.map(async scene => {
                const newScene = await ArScene.create({
                    ...scene.get({ plain: true }),
                    id: undefined, // générer un nouvel id
                    projectId: newProject.id // lier la scène au nouveau projet
                },{
                    transaction:t
                });


                await Promise.all(scene.assets.map(async asset => {
                    return ArAsset.create({
                        ...asset.get({ plain: true }),
                        id: undefined, // générer un nouvel id
                        sceneId: newScene.id, // lier le nouvel asset à la nouvelle scène
                        url: getUpdatedPath(asset.url, projectId, newProject.id)
                    }, {
                        transaction:t
                    });
                }));

                // Dupliquer les labels
                await Promise.all(scene.labels.map(async label => {
                    return ArLabel.create({
                        ...label.get({ plain: true }),
                        id: undefined, // générer un nouvel id
                        sceneId: newScene.id // lier le nouveau label à la nouvelle scène
                    }, {
                        transaction:t
                    });
                }));


                return newScene;
            }));


            await duplicateFolder(getProjectDirectory(projectId), getProjectDirectory(newProject.id))
            if(newProject.pictureUrl != null){
                newProject.pictureUrl = getUpdatedPath(newProject.pictureUrl, projectId, newProject.id)
                await newProject.save({transaction:t});
            }


            res.status(200).send(newProject);

        })


    } catch (error) {
        console.log(error)
        res.status(400).json({ error: 'Unable to duplicate project' });
    }
})

export default router
