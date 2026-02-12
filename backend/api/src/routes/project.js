import express from 'express'
import {baseUrl} from "./baseUrl.js";
import {ArMesh, ArAsset, ArLabel, ArProject, ArScene, ArUser, ArPreset, ArAction} from "../orm/index.js";
import {sequelize} from "../orm/database.js";
import authMiddleware, {optionnalAuthMiddleware} from "../middlewares/auth.js";
import {
    deleteFile,
    deleteFolder,
    duplicateFolder,
    getProjectDirectory, getTempDirectory,
    getUpdatedPath,
    uploadCover, uploadProject
} from "../utils/fileUpload.js";
import {Op} from "sequelize";
import * as path from "node:path";
import * as fs from "node:fs";
import {DIRNAME} from "../../app.js";
import decompress from "decompress"
import {updateUrl} from "../utils/updateUrl.js";


const router = express.Router()

const PAGE_LENGTH = 20;

const projectInclude = [
    {
        model: ArScene,
        as: "scenes",
        separate: true,
        order: [['index', 'ASC']],
        include: [
            { 
                model: ArMesh, 
                as: "meshes" 
            },
            { 
                model: ArAsset, 
                as: "assets", 
                where: { hideInViewer: false }, 
                required: false 
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
    },
    {
        model: ArPreset,
        as: "presets",
        include: [{ 
            model: ArAction, 
            as: "actions"
        }]
    }
];

router.get(baseUrl+'projects/:page', optionnalAuthMiddleware, async (req, res) => {
    const page = parseInt(req.params.page);
    try{

        let where = {}
        if(req.user)
            where = {
                [Op.or]: {
                    published: true,
                    userId: req.user.id,
                }
            }
        else
            where = {published:true}

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
            where,
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



router.get(baseUrl+'project/:projectId', optionnalAuthMiddleware, async (req, res) => {
    let where = {}
    if(req.user)
        where = {
            id: req.params.projectId,
            [Op.or]: {
                published: true,
                userId: req.user.id,
            }
        }
    else
        where = {published:true, id: req.params.projectId}

    let attributes = {}
    if(!req.user)
        attributes.exclude = ['presets']

    let project = await ArProject.findOne({
            where,
            attributes,
            include: projectInclude
        })

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

        if (project.userId !== token.id && !req.user.admin)
            return res.status(403).send({error: "User not granted"})


        let updatedUrl = req.body.pictureUrl;
        if(uploadedUrl){
            deleteFile(req.body.pictureUrl);
            updatedUrl = uploadedUrl
        }

        await project.update({
            published: req.body?.published,
            title: req.body?.title,
            description: req.body?.description,
            pictureUrl: updatedUrl,
            userId: token.id,
            quitMessage: req.body.quitMessage,
            quitUrl: req.body.quitUrl,
            unit: req.body?.unit,
            displayMode: req.body.displayMode,
            calibrationMessage: req.body?.calibrationMessage,
        }, {
            returning: true
        })

        if(req.body.scenes) {
            let currentIndex = 0;
            for (let scene of JSON.parse(req.body.scenes)) {
                await ArScene.update({
                    index:currentIndex,
                },{
                    where: {id: scene.id},
                });
                currentIndex++;
            }
        }

        // gestion des presets
        if (req.body.presets) {
            const presetsData = typeof req.body.presets === 'string'
                ? JSON.parse(req.body.presets)
                : req.body.presets;

            // Supprimer les anciens presets
            const ArPreset = sequelize.models.ArPreset;
            const ArAction = sequelize.models.ArAction;

            await ArPreset.destroy({ where: { projectId: project.id } });

            // Créer les nouveaux
            for (const presetData of presetsData) {
                const newPreset = await ArPreset.create({
                    projectId: project.id,
                    bigText: presetData.bigText,
                    icon: presetData.icon,
                    text: presetData.text
                });

                if (presetData.actions && Array.isArray(presetData.actions)) {
                    for (const actionData of presetData.actions) {
                        await ArAction.create({
                            presetId: newPreset.id,
                            event: actionData.event,
                            targetSceneId: actionData.targetSceneId || actionData.parameters?.sceneId || null,
                            targetAssetId: actionData.targetAssetId || actionData.parameters?.assetId || null,
                            parameters: actionData.parameters || {}
                        });
                    }
                }
            }
        }

        const updatedProject = await ArProject.findOne({
            where: { id: projectId },
            include: projectInclude
        })

        return res.status(200).send(updatedProject)
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
            quitMessage: req.body.quitMessage,
            quitUrl: req.body.quitUrl,
            published: req.body?.published,
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

        if(project.owner.id != token.id && !req.user.admin)
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
                            model:ArMesh,
                            as:'meshes'
                        },
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

        if(project.owner.id != token.id && !req.user.admin){
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

                await Promise.all(scene.meshes.map(async mesh => {
                    return ArMesh.create({
                        ...mesh.get({ plain: true }),
                        id: "project-"+newProject.id+"-scene-"+newScene.title+"-mesh-"+mesh.name, // générer un nouvel id
                        sceneId: newScene.id, // lier le nouvel asset à la nouvelle scène
                    }, {
                        transaction:t
                    });
                }));

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

router.put(baseUrl+'project/:projectId/presets', authMiddleware, async (req, res) => {
    const token = req.user
    const projectId = req.params.projectId

    const project = await ArProject.findOne({
        where: { id: projectId },
    })

    if(!project)
        return res.status(404).send({ error: 'No project found'});

    try {
        const ArPreset = sequelize.models.ArPreset;
        const ArAction = sequelize.models.ArAction;

        // Supprimer les anciens presets
        await ArPreset.destroy({ where: { projectId: project.id } });

        // Créer les nouveaux
        const presetsData = req.body.presets;

        if (presetsData && Array.isArray(presetsData)) {
            for (const presetData of presetsData) {
                const newPreset = await ArPreset.create({
                    projectId: project.id,
                    bigText: presetData.bigText,
                    icon: presetData.icon,
                    text: presetData.text
                });

                if (presetData.actions && Array.isArray(presetData.actions)) {
                    for (const actionData of presetData.actions) {
                        await ArAction.create({
                            presetId: newPreset.id,
                            event: actionData.event,
                            targetSceneId: actionData.targetSceneId || actionData.parameters?.sceneId || null,
                            targetAssetId: actionData.targetAssetId || actionData.parameters?.assetId || null,
                            parameters: actionData.parameters || {}
                        });
                    }
                }
            }
        }

        const updatedProject = await ArProject.findOne({
            where: { id: projectId },
            include: projectInclude
        });

        return res.status(200).send(updatedProject)

    } catch(e) {
        console.log(e);
        res.status(400);
        return res.send({ error: 'Unable to save presets'});
    }


})


// routes pour le mode admin

const PROJECTS_PAGE_LENGTH = 10;

router.get(baseUrl+'admin/projects/:page?', async (req, res) => {
    const page = parseInt(req.params.page) || 1;
    try{
        const where = {}

        if(req.query?.title)
            where.title = {
                [Op.like]: `%${req.query?.title}%`
            }

        const rows = await ArProject.findAll({
            subQuery: false,
            attributes: [
                "id",
                "title",
                "description",
                "published",
                "calibrationMessage",
                "unit",
                "pictureUrl",
                "updatedAt",
            ],
            include: [
                {
                    model: ArScene,
                    as: "scenes",
                    separate: true
                },
                {
                    model: ArUser,
                    as: "owner",
                    attributes: ["username"],
                }
            ],
            where,
            group: ['ArProject.id'],
            limit: PROJECTS_PAGE_LENGTH,
            offset: (page - 1) * PROJECTS_PAGE_LENGTH,
            order: [['updatedAt', 'DESC']],
        });

        const count = await ArProject.count({
            where
        })

        res.set({
            'Content-Type': 'application/json'
        });

        if(rows == null){
            res.status(404);
            return res.send({ error: 'No project found'});
        }else{
            res.status(200);
            return res.send({
                projects: rows,
                totalPages: Math.ceil(count / PROJECTS_PAGE_LENGTH),
                currentPage: page,
            });
        }
    }catch (e){
        console.log(e);
        res.status(400);
        return res.send({error: 'Unable to fetch projects'});
    }

})

router.get(baseUrl+'project/:projectId/export', authMiddleware, async (req, res) => {
    const token = req.user
    const projectId = req.params.projectId

    if(!token.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    res.setHeader("Keep-Alive", "timeout=300")

    try {

        const project = await ArProject.findOne({
            where: {id: projectId},
            include:[
                {
                    model: ArScene,
                    as: "scenes",
                    separate: true,
                    order: [['index', 'ASC']],
                    //attributes: {exclude: ['id']},
                    include:[
                        {
                            model:ArMesh,
                            as:"meshes",
                            // exclude: [id]
                        },
                        {
                            model: ArAsset,
                            as: "assets",
                            required:false,
                            // exclude: [id]
                        },
                        {
                            model: ArLabel,
                            as: "labels",
                            // exclude: [id]
                        },
                    ],
                },

                {
                    model: ArUser,
                    as: "owner",
                    attributes: ["username"],
                },
                {
                    model: sequelize.models.ArPreset,
                    as: "presets",
                    include:[
                        {
                            model: sequelize.models.ArAction,
                            as: "actions"
                        }
                    ]
                }

            ],
        })

        if (project) {

            const jsonFilePath = path.join(getTempDirectory(), projectId + "-" + Date.now() + '.json')

            if (!fs.existsSync(getTempDirectory()))
                fs.mkdirSync(getTempDirectory(), { recursive: true })

            const projectObj = project.toJSON()
            delete projectObj.id

            await fs.writeFile(path.join(DIRNAME, jsonFilePath), JSON.stringify(projectObj), (err) => {})

            res.zip({
                files: [

                    {
                        path: path.join(DIRNAME, jsonFilePath),
                        name: 'project.json'
                    },

                    {
                        path: getProjectDirectory(projectId),
                        name: "files"
                    }

                ],
                filename: `project-${projectId}.zip`
            })

        } else
            return res.status(404).send({error: 'Project not found'})

    }catch (e){
        console.log(e);
        res.status(400);
        return res.send({error: 'Unable to fetch project'});
    }

})



router.post(baseUrl+'project/import', authMiddleware, uploadProject.single("zip"), async (req, res) => {
    const token = req.user

    if(!token.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'User not granted' })
    }

    console.log(req.uploadedFilePath)

    try {
        const dataFolder = req.uploadedFilePath + "-data"
        // dézipper le fichier
        await decompress(req.uploadedFilePath, dataFolder)

        // créer les enregistrements dans la BD
        const projectFilePath = path.join(dataFolder, "project.json")
        const data = fs.readFileSync(projectFilePath)

        const projectObj = JSON.parse(data)
        projectObj.userId = token.id

        const presetsData = projectObj.presets || [];
        delete projectObj.presets;
        const sourceScenesData = JSON.parse(JSON.stringify(projectObj.scenes || []));
        
        const removeIds = (obj) => {
            if (Array.isArray(obj)) obj.forEach(removeIds);
            else if (typeof obj === 'object' && obj !== null) {
                delete obj.id;
                Object.values(obj).forEach(removeIds);
            }
        };
        removeIds(projectObj.scenes);


        const project = await ArProject.create(projectObj, {
            include: [
                {
                    model: ArScene,
                    as: "scenes",
                    include:[
                        {
                            model:ArMesh,
                            as:"meshes",
                        },
                        {
                            model: ArAsset,
                            as: "assets",
                        },
                        {
                            model: ArLabel,
                            as: "labels",
                        },
                    ],
                },

            ]
        })

        // modifier l'url des fichiers (assets, cover...)
        project.pictureUrl = updateUrl(project.pictureUrl, project.id)
        await project.save()

        const sceneMap = new Map();
        const assetMap = new Map();
        const labelMap = new Map();

        for(let i = 0; i < project.scenes.length; i++) {
            const scene = project.scenes[i];
            const oldSceneData = sourceScenesData[i];
            
            if(oldSceneData && oldSceneData.id) {
                sceneMap.set(oldSceneData.id, scene.id);
            }

            scene.envmapUrl = updateUrl(scene.envmapUrl, project.id)

            for(let j = 0; j < scene.assets.length; j++) {
                const asset = scene.assets[j];
                const oldAssetData = oldSceneData ? oldSceneData.assets[j] : null;

                if(oldAssetData && oldAssetData.id) {
                    assetMap.set(oldAssetData.id, asset.id);
                }

                asset.url = updateUrl(asset.url, project.id)
                await asset.save()
            }

            for(let j = 0; j < scene.labels.length; j++) {
                const label = scene.labels[j];
                const oldLabelData = oldSceneData ? oldSceneData.labels[j] : null;

                if(oldLabelData && oldLabelData.id) {
                    labelMap.set(oldLabelData.id, label.id);
                }
            }

            await scene.save()
        }


        for (const presetData of presetsData) {
            const newPreset = await ArPreset.create({
                projectId: project.id,
                bigText: presetData.bigText,
                icon: presetData.icon,
                text: presetData.text
            });

            if (presetData.actions && Array.isArray(presetData.actions)) {
                for (const actionData of presetData.actions) {
                    
                    let newTargetSceneId = null;
                    if (actionData.targetSceneId) {
                        newTargetSceneId = sceneMap.get(actionData.targetSceneId);
                    }

                    let newTargetAssetId = null;
                    if (actionData.targetAssetId) {
                        newTargetAssetId = assetMap.get(actionData.targetAssetId);
                    }

                    const newParams = { ...actionData.parameters };
                    if (newParams.sceneId) newParams.sceneId = sceneMap.get(newParams.sceneId) || newParams.sceneId;
                    if (newParams.assetId) newParams.assetId = assetMap.get(newParams.assetId) || newParams.assetId;
                    if (newParams.labelId) newParams.labelId = labelMap.get(newParams.labelId) || newParams.labelId;


                    await ArAction.create({
                        presetId: newPreset.id,
                        event: actionData.event,
                        targetSceneId: newTargetSceneId,
                        targetAssetId: newTargetAssetId,
                        parameters: newParams
                    });
                }
            }
        }


        const projectDir = getProjectDirectory(project.id)

        await fs.renameSync(dataFolder+"/files", projectDir)

        // supprimer les fichiers temporaires
        fs.rmSync(dataFolder, {recursive: true})
        fs.rmSync(req.uploadedFilePath)

        return res.status(200).send(project)

    } catch(e) {
        console.log(e);
        res.status(400);
        return res.send({error: 'Unable to fetch project'});
    }

})













export default router
