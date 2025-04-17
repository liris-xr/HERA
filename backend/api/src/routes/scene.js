import express from 'express'
import {baseUrl} from "./baseUrl.js";
import {ArMesh, ArAsset, ArLabel, ArProject, ArScene, ArUser} from "../orm/index.js";
import authMiddleware from "../middlewares/auth.js";
import {sequelize} from "../orm/database.js";
import {Sequelize} from "sequelize";
import {updateListById} from "../utils/updateListById.js";
import {deleteAsset, deleteFile, uploadEnvmapAndAssets} from "../utils/fileUpload.js";

const router = express.Router()

router.get(baseUrl+'scenes/:sceneId', authMiddleware, async (req, res) => {
    const sceneId = req.params.sceneId;
    const token = req.user
    try{
        let scene = (await ArScene.findOne({
            include: [
                {
                    model: ArMesh,
                    as: "meshes"
                },
                {
                    model: ArAsset,
                    as: "assets",
                },
                {
                    model: ArLabel,
                    as: "labels",
                },
                {
                    model: ArProject,
                    as: "project",
                    attributes: ["id","title", "unit"],
                    include:[{
                        model: ArUser,
                        as:"owner",
                        attributes:["id", "username"]
                    }]
                }
            ],
            where: {id: sceneId},
        }));
        res.set({
            'Content-Type': 'application/json'
        });

        if (scene == null)
            return res.status(404).send({error: 'Scene not found'})

        if (scene.project.owner.id != token.id && !req.user.admin)
            return res.status(403).send({error: "User not granted"})

        res.status(200);
        return res.send(scene);

    }catch (e){
        console.log(e);
        res.status(400);
        return res.send({ error: 'Unable to fetch scene'});
    }

})






// Middleware to extract some project data before upload
const getPostUploadData = async (req, res, next) => {
    let sceneId = req.params.sceneId

    let scene = await ArScene.findOne({
        include: [
            {
                model: ArMesh,
                as: "meshes"
            },
            {
                model: ArAsset,
                as: "assets"
            },
            {
                model: ArProject,
                as: "project",
                attributes: ["id"],
            }
        ],
        where: {id: sceneId},
    })

    if (scene == null)
        return res.status(404).send({error: 'Scene not found'})

    req.currentAssetCount = scene.assets.length
    req.projectId = scene.project.id;
    next();
};


router.put(baseUrl+'scenes/:sceneId', authMiddleware, getPostUploadData,
    uploadEnvmapAndAssets.fields([{
        name: "uploadedEnvmap",
        maxCount: 1
    },
    {
        name: "uploads",
        maxCount: 16
    }]
    ), async (req, res) => {
    let token = req.user
    let sceneId = req.params.sceneId
    let uploadedUrl = req.uploadedUrl;

    try {
        const fetchScene = async () => await ArScene.findOne({
            include: [
                {
                    model: ArProject,
                    as: "project",
                    include: [
                        {
                            model: ArUser,
                            as: "owner",
                            attributes: ["id"],
                        }
                    ]
                },
                {
                    model: ArLabel,
                    as: "labels"
                },
                {
                    model: ArAsset,
                    as: "assets"
                },
                {
                    model: ArMesh,
                    as: "meshes"
                }
            ],
            where: {id: sceneId},
        })


        let scene = await fetchScene()

        if (scene == null)
            return res.status(404).send({error: 'Scene not found'})

        if (scene.project.owner.id != token.id && !req.user.admin)
            return res.status(403).send({error: "User not granted"})


        const knownLabelsIds = scene.labels.map( (label) => label.id )
        const knownAssetsIds = scene.assets.map( (asset) => asset.id )
        const knonwMeshesIds = scene.meshes.map( (mesh) => mesh.id )

        let assetsIdMatching = []

        console.log("known ids")
        console.log(knownAssetsIds)

        let insertedCount = 0;
        if(!req.uploadedFilenames) req.uploadedFilenames = [];

        await sequelize.transaction(async (t) => {
            await updateListById(knownLabelsIds, JSON.parse(req.body.labels),
                async (label)=>{
                    await ArLabel.update({
                        text:label.text,
                        position:label.position,
                        timestampStart:label.timestampStart,
                        timestampEnd:label.timestampEnd,
                    }, {
                        where: {id: label.id},
                        returning: true,
                        transaction:t
                    })
                },

                async (label)=>{
                    await ArLabel.create({
                        text:label.text,
                        position:label.position,
                        sceneId:scene.id,
                        timestampStart:label.timestampStart,
                        timestampEnd:label.timestampEnd,
                    },{
                        transaction:t
                    })
                },

                async (knownId)=>{
                    await ArLabel.destroy({where: {id: knownId},transaction:t});
                }
            );

            await updateListById(knownAssetsIds, JSON.parse(req.body.assets),
                async (asset)=>{
                    await ArAsset.update({
                        position:asset.position,
                        rotation:asset.rotation,
                        scale: asset.scale,
                        hideInViewer: asset.hideInViewer
                    }, {
                        where: {id: asset.id},
                        returning: true,
                        transaction:t
                    })
                },

                async (asset)=>{
                    console.log("abcd " + JSON.stringify(asset))

                    let data = {
                        position:asset.position,
                        rotation:asset.rotation,
                        scale: asset.scale,
                        sceneId:scene.id,
                        name: asset.name,
                    }
                    if(asset.copiedUrl) {
                        data.url = asset.copiedUrl
                    } else
                        data.url = req.uploadedFilenames[insertedCount++]

                    const newAsset = await ArAsset.create(data,{
                        transaction:t
                    })




                    assetsIdMatching.push({
                        tempId:asset.id,
                        newId:newAsset.id
                    })
                },

                async (knownId)=>{
                    const assetToDelete = await ArAsset.findOne({where: {id: knownId},transaction:t})
                    await deleteAsset(assetToDelete)
                    assetToDelete.destroy({transaction:t})
                    await assetToDelete.save({transaction:t})
                }
            );

            await updateListById(knonwMeshesIds, JSON.parse(req.body.meshes),
                async (mesh) => {
                    await ArMesh.update({
                        position:mesh.position,
                        rotation:mesh.rotation,
                        scale: mesh.scale,
                        emissiveIntensity: mesh.emissiveIntensity,
                        emissiveColor: mesh.emissiveColor,
                        roughenss: mesh.roughness,
                        metalness: mesh.metalness,
                        opacity: mesh.opacity
                    }, {
                        where: {id: mesh.id},
                        returning: true,
                        transaction:t
                    })
                },

                async (mesh)=>{
                    await ArMesh.create({
                        position:mesh.position,
                        rotation:mesh.rotation,
                        scale: mesh.scale,
                        sceneId:scene.id,
                        assetId:mesh.assetId,
                        name: mesh.name,
                        emissiveIntensity: mesh.emissiveIntensity,
                        emissiveColor: mesh.emissiveColor,
                        roughenss: mesh.roughness,
                        metalness: mesh.metalness,
                        opacity: mesh.opacity
                    },{
                        transaction:t
                    })
                },
                
                async (knownId)=>{
                    await ArMesh.destroy({where: {id: knownId},transaction:t});
                }
        
            );

            let updatedUrl = req.uploadedUrl;
            if(uploadedUrl && scene.envmapUrl !== ""){
                deleteFile(scene.envmapUrl);
                updatedUrl = uploadedUrl
            }

            //update the main scene
            await ArScene.update({
                title: req.body.title,
                description: req.body.description,
                envmapUrl: updatedUrl || req.body.envmapUrl
            },{
                where: {id: sceneId},
                transaction:t,
            })

        })


        scene = await fetchScene()



        res.status(200).send({
            scene:scene,
            assetsIdMatching: assetsIdMatching
        })
    }catch (e){
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        res.send({ error: 'Unable to save scene'});
    }
})


router.post(baseUrl+'scenes', authMiddleware, async (req, res) => {
    const token = req.user
    try{

        const project = await ArProject.findOne({
            where: {
                id: req.body.projectId
            },
            include:[{
                model: ArUser,
                as:"owner",
            }]
        })

        if (project.owner.id != token.id && !req.user.admin)
            return res.status(403).send({error: "User not granted"})


        const projectScenesIndexes = await ArScene.findOne({
            where: {
                projectId: req.body.projectId
            },
            attributes: [
                [Sequelize.fn('MAX', Sequelize.col('index')), 'maxIndex']
            ],
            raw:true
        });


        let newIndex = 0
        if(projectScenesIndexes.maxIndex !== null) newIndex = projectScenesIndexes.maxIndex+1

        let newScene = await ArScene.create({
            title: req.body.title,
            projectId: req.body.projectId,
            index: newIndex
        });

        res.set({
            'Content-Type': 'application/json'
        });
        res.status(200);
        return res.send(newScene);

    }catch (e){
        console.log(e);
        res.status(400);
        return res.send({ error: 'Unable to create scene'});
    }
})


router.delete(baseUrl+'scenes/:sceneId', authMiddleware, async (req, res) => {
    const token = req.user
    const sceneId = req.params.sceneId
    try{
        let scene = await ArScene.findOne({
            include:[
                {
                    model: ArProject,
                    as: "project",
                    attributes:["id"],
                    include:[
                        {
                            model: ArUser,
                            as: "owner",
                            attributes: ["id"]
                        }
                    ]
                },
                {
                    model: ArAsset,
                    as:"assets"
                }
            ],
            where: {id: sceneId},
        })

        res.set({
            'Content-Type': 'application/json'
        });

        if(scene == null){
            return res.status(404).send({error: 'Scene not found'})
        }

        if(scene.project.owner.id != token.id && !req.user.admin)
            return res.status(403).send({error: 'User not granted'})


        for (let asset of scene.assets) {
            await deleteAsset(asset);
        }

        await scene.destroy();
        res.status(200);
        return res.send();

    }catch (e){
        console.log(e);
        res.status(400);
        return res.send({ error: 'Unable to delete scene'});
    }
})



router.post(baseUrl+'scene/:sceneId/copy', authMiddleware, async (req, res) => {
    const token = req.user
    const sceneId = req.params.sceneId;

    try {

        const scene = await ArScene.findOne({
            where: { id: sceneId },
            include: [
                {
                    model: ArAsset,
                    as: 'assets'
                },
                {
                    model: ArLabel,
                    as: 'labels'
                },
                {
                   model:ArProject,
                   as: "project",
                   attributes: ["id"],
                   include:[
                       {
                           model: ArUser,
                           as: "owner",
                           attributes: ["id"]
                       }
                   ]
                }
            ]
        });

        res.set({
            'Content-Type': 'application/json'
        });

        if (!scene) {
            return res.status(404).json({ error: 'Scene not found' });
        }

        if(scene.project.owner.id != token.id && !req.user.admin){
            return res.status(403).send({error: 'User not granted'});
        }

        await sequelize.transaction(async (t) => {

            //copy the scene
            const newScene = await ArScene.create({
                ...scene.get({ plain: true }),
                id: undefined,
                title: req.body.newTitle,
            },{
                transaction: t
            });

            //copy all assets related to scene
            const newAssets = await Promise.all(scene.assets.map(async asset => {
                return ArAsset.create({
                    ...asset.get({ plain: true }),
                    id: undefined, // générer un nouvel id
                    sceneId: newScene.id // lier le nouvel asset à la nouvelle scène
                },{
                    transaction:t
                });
            }));

            //copy all labels related to scene
            const newLabels = await Promise.all(scene.labels.map(async label => {
                return ArLabel.create({
                    ...label.get({ plain: true }),
                    id: undefined,
                    sceneId: newScene.id
                },{
                    transaction:t
                });
            }));

            res.status(200).send(newScene);

        })


    } catch (error) {
        console.log(error)
        res.status(400).json({ error: 'Unable to duplicate scene' });
    }
})



export default router
