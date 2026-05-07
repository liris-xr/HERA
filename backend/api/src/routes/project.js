import express from 'express'
import {baseUrl} from "./baseUrl.js";
import {ArMesh, ArAsset, ArLabel, ArProject, ArScene, ArUser} from "../orm/index.js";
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
            include:[
                {
                    model: ArScene,
                    as: "scenes",
                    separate: true,
                    order: [['index', 'ASC']],
                    include:[
                        {
                            model:ArMesh,
                            as:"meshes"
                        },
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
            await deleteFile(req.body.pictureUrl);
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

router.post(baseUrl+'project/:projectId/image', authMiddleware, uploadCover.single('image'), async (req, res) => {
    try {
        const fullUrl = req.protocol + '://' + req.get('host') + '/' + req.uploadedUrl.replace(/\\/g, '/');
        return res.status(200).send({ url: fullUrl });
    } catch(e) {
        return res.status(400).send({ error: 'Upload failed' });
    }
});




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
            const oldSceneIdToNew = {};
            const oldAssetIdToNew = {};
            const oldLabelIdToNew = {};

            const newScenes = await Promise.all(project.scenes.map(async scene => {
                const newScene = await ArScene.create({
                    ...scene.get({ plain: true }),
                    id: undefined, // new id
                    projectId: newProject.id // link to project
                },{
                    transaction:t
                });
                
                oldSceneIdToNew[scene.id] = newScene.id;

                await Promise.all(scene.meshes.map(async mesh => {
                    return ArMesh.create({
                        ...mesh.get({ plain: true }),
                        id: "project-"+newProject.id+"-scene-"+newScene.title+"-mesh-"+mesh.name, // new id
                        sceneId: newScene.id, // link to scene
                    }, {
                        transaction:t
                    });
                }));

                await Promise.all(scene.assets.map(async asset => {
                    const newAsset = await ArAsset.create({
                        ...asset.get({ plain: true }),
                        id: undefined, // new id
                        sceneId: newScene.id, // link to scene
                        url: getUpdatedPath(asset.url, projectId, newProject.id)
                    }, {
                        transaction:t
                    });
                    oldAssetIdToNew[asset.id] = newAsset.id;
                    return newAsset;
                }));

                // copy labels
                const hostUrl = req.protocol + '://' + req.get('host');
                await Promise.all(scene.labels.map(async label => {
                    const labelData = label.get({ plain: true });
                    if (labelData.text) {
                        // update urls and add host
                        labelData.text = updateUrl(labelData.text, newProject.id, hostUrl);
                    }
                    const newLabel = await ArLabel.create({
                        ...labelData,
                        id: undefined, // new id
                        sceneId: newScene.id // link to scene
                    }, {
                        transaction:t
                    });
                    oldLabelIdToNew[label.id] = newLabel.id;
                    return newLabel;
                }));


                return newScene;
            }));


            await duplicateFolder(getProjectDirectory(projectId), getProjectDirectory(newProject.id))
            if(newProject.pictureUrl != null){
                newProject.pictureUrl = getUpdatedPath(newProject.pictureUrl, projectId, newProject.id)
                await newProject.save({transaction:t});
            }

            // Update preset actions with new IDs
            if (project.presets) {
                let newPresets = JSON.parse(JSON.stringify(project.presets));
                for (let preset of newPresets) {
                    if (preset.text) {
                        preset.text = updateUrl(preset.text, newProject.id, hostUrl);
                    }
                    if (preset.actions) {
                        for (let action of preset.actions) {
                            if (action.args && action.args[0]) {
                                if (action.args[0].sceneId && oldSceneIdToNew[action.args[0].sceneId]) {
                                    action.args[0].sceneId = oldSceneIdToNew[action.args[0].sceneId];
                                }
                                if (action.args[0].assetId && oldAssetIdToNew[action.args[0].assetId]) {
                                    action.args[0].assetId = oldAssetIdToNew[action.args[0].assetId];
                                }
                                if (action.args[0].labelId && oldLabelIdToNew[action.args[0].labelId]) {
                                    action.args[0].labelId = oldLabelIdToNew[action.args[0].labelId];
                                }
                            }
                        }
                    }
                }
                newProject.presets = newPresets;
                await newProject.save({transaction:t});
            }


            res.status(200).send(newProject);

        })


    } catch (error) {
        console.log(error)
        res.status(400).json({ error: 'Unable to duplicate project' });
    }
})


// admin routes

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
                    include:[
                        {
                            model:ArMesh,
                            as:"meshes",
                        },
                        {
                            model: ArAsset,
                            as: "assets",
                            required:false,
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

        if (project) {

            const jsonFilePath = path.join(getTempDirectory(), projectId + "-" + Date.now() + '.json')

            await fs.promises.mkdir(getTempDirectory(), { recursive: true })

            const projectObj = project.toJSON()

            await fs.promises.writeFile(path.join(DIRNAME, jsonFilePath), JSON.stringify(projectObj))

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
        // unzip file
        await decompress(req.uploadedFilePath, dataFolder)

        // create records
        const projectFilePath = path.join(dataFolder, "project.json")
        const data = await fs.promises.readFile(projectFilePath, 'utf8')

        const projectObj = JSON.parse(data)
        projectObj.userId = token.id
        
        // Generate new UUIDs to prevent conflicts when importing, 
        // while preserving the assetId link in meshes
        const crypto = await import('crypto');
        const oldSceneIdToNew = {};
        const oldAssetIdToNew = {};
        const oldLabelIdToNew = {};
        
        projectObj.id = crypto.randomUUID();
        
        for (let scene of projectObj.scenes || []) {
            const newSceneId = crypto.randomUUID();
            oldSceneIdToNew[scene.id] = newSceneId;
            scene.id = newSceneId;
            for (let asset of scene.assets || []) {
                if (asset.id) {
                    const newId = crypto.randomUUID();
                    oldAssetIdToNew[asset.id] = newId;
                    asset.id = newId;
                }
            }
            for (let label of scene.labels || []) {
                if (label.id) {
                    const newId = crypto.randomUUID();
                    oldLabelIdToNew[label.id] = newId;
                    label.id = newId;
                }
            }
            for (let mesh of scene.meshes || []) {
                mesh.id = crypto.randomUUID();
                if (mesh.assetId && oldAssetIdToNew[mesh.assetId]) {
                    mesh.assetId = oldAssetIdToNew[mesh.assetId];
                }
            }
        }
        
        const hostUrl = req.protocol + '://' + req.get('host');
        if (projectObj.presets) {
            for (let preset of projectObj.presets) {
                if (preset.text) {
                    preset.text = updateUrl(preset.text, projectObj.id, hostUrl);
                }
                if (preset.actions) {
                    for (let action of preset.actions) {
                        if (action.args && action.args[0]) {
                            if (action.args[0].sceneId && oldSceneIdToNew[action.args[0].sceneId]) {
                                action.args[0].sceneId = oldSceneIdToNew[action.args[0].sceneId];
                            }
                            if (action.args[0].assetId && oldAssetIdToNew[action.args[0].assetId]) {
                                action.args[0].assetId = oldAssetIdToNew[action.args[0].assetId];
                            }
                            if (action.args[0].labelId && oldLabelIdToNew[action.args[0].labelId]) {
                                action.args[0].labelId = oldLabelIdToNew[action.args[0].labelId];
                            }
                        }
                    }
                }
            }
        }

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

        // update file urls

        project.pictureUrl = updateUrl(project.pictureUrl, project.id, hostUrl)
        await project.save()

        for(let scene of project.scenes) {
            scene.envmapUrl = updateUrl(scene.envmapUrl, project.id, hostUrl)

            for(let asset of scene.assets) {
                asset.url = updateUrl(asset.url, project.id, hostUrl)
                await asset.save()
            }

            for(let label of scene.labels) {
                label.text = updateUrl(label.text, project.id, hostUrl)
                await label.save()
            }

            await scene.save()
        }


        const projectDir = getProjectDirectory(project.id)

        await fs.promises.rename(dataFolder+"/files", projectDir)

        // supprimer les fichiers temporaires
        await fs.promises.rm(dataFolder, {recursive: true, force: true})
        await fs.promises.rm(req.uploadedFilePath, {force: true})

        return res.status(200).send(project)

    } catch(e) {
        console.log(e);
        res.status(400);
        return res.send({error: 'Unable to fetch project'});
    }

})













export default router
