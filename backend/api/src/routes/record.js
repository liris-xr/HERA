import express from 'express'
import {baseUrl} from "./baseUrl.js";
import authMiddleware from "../middlewares/auth.js";
import ArRecord from "../orm/models/arRecord.js";

const router = express.Router()

const PAGE_LENGTH = 20;

/**
 * Route to fetch all records
 */
router.get(baseUrl+'records/:page' , authMiddleware,async (req, res) => {
    const authUser = req.user
    if(!authUser.admin) {
        res.status(401);
        return res.send({ error: 'Unauthorized', details: 'Permission not granted' })
    }

    const page = parseInt(req.params.page);
    try{
        if(!req.user.admin){
            res.status(401);
            return res.send({ error: 'Unauthorized', details: 'Permission not granted' })
        }

        let records = await ArRecord.findAll({
            subQuery:false,
            attributes: [
                "id",
                "projectId",
                "sceneId",
                "userId",
                "date",
                "time",
                "frame",
                "matrix"
            ],
            limit: PAGE_LENGTH,
            offset: page * PAGE_LENGTH,
            order: [['projectId', 'DESC'],['userId', 'DESC'],['time', 'DESC']],
        });

        res.set({
            'Content-Type': 'application/json'
        });

        if(records == null){
            res.status(404);
            return res.send({ error: 'Unable to fetch records'});
        }else{
            res.status(200);
            return res.send(records);
        }
    }catch (e){
        console.log(e);
        res.status(400);
        return res.send({error: 'Unexpected error'});
    }
});


/**
 * Route to add records
 */
router.post(baseUrl+"records/", authMiddleware, async (req, res) => {
    try {
        const recordsToAddJson = req.body;
        for(let i=0; i<recordsToAddJson.length; i++) {
            let scene = await fetch(`${ENDPOINT}scene/${recordsToAddJson[i].sceneId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            scene = await scene.json()
            await ArRecord.create({
                projectId: scene ? scene.projectId : null,
                sceneId: recordsToAddJson[i].sceneId,
                userId: recordsToAddJson[i].userId,
                time: recordsToAddJson[i].time,
                frame: recordsToAddJson[i].frame.toString(),
                matrix: recordsToAddJson[i].matrix?.join(','),
            })
        }
        res.set({
            'Content-Type': 'application/json'
        });
        res.status(200);
        return res.send('Record added successfully');

    } catch(e) {
        console.log(e)
        res.set({
            'Content-Type': 'application/json'
        })
        res.status(400);
        return res.send({ error: 'Unable to create record'});
    }
})

export default router;