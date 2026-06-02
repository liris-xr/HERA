import express from 'express'
import {baseUrl} from "./baseUrl.js";
import {ArProject} from "../orm/index.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router()

const PRESETS_PAGE_LENGTH = 10;

// get presets
router.get(baseUrl+'admin/presets/:page?', authMiddleware, async (req, res) => {
    const user = req.user
    const page = parseInt(req.params.page) || 1

    if(!user.admin) {
        return res.status(401).send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const rows = await ArProject.findAll({
            attributes: ['id', 'title', 'presets']
        });
        
        let allPresets = [];
        for (let proj of rows) {
            if (proj.presets && Array.isArray(proj.presets)) {
                for (let i = 0; i < proj.presets.length; i++) {
                    const p = proj.presets[i];
                    allPresets.push({
                        ...p,
                        projectId: proj.id,
                        projectTitle: proj.title,
                        presetIndex: i
                    });
                }
            }
        }
        
        // filter
        if (req.query?.title) {
            allPresets = allPresets.filter(p => 
                (p.bigText && p.bigText.toLowerCase().includes(req.query.title.toLowerCase())) || 
                (p.text && p.text.toLowerCase().includes(req.query.title.toLowerCase()))
            );
        }
        
        const totalPages = Math.ceil(allPresets.length / PRESETS_PAGE_LENGTH);
        const paginatedPresets = allPresets.slice((page - 1) * PRESETS_PAGE_LENGTH, page * PRESETS_PAGE_LENGTH);

        res.status(200).send({
            presets: paginatedPresets,
            totalPages: totalPages,
            currentPage: page,
        });
    } catch (e) {
        console.error(e);
        res.status(400).send({error: 'Unable to fetch presets'});
    }
})

// delete preset
router.delete(baseUrl+'admin/presets/:projectId/:index', authMiddleware, async (req, res) => {
    const user = req.user
    if(!user.admin) {
        return res.status(401).send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        const project = await ArProject.findOne({
            where: { id: req.params.projectId }
        })

        if (project && project.presets) {
            let newPresets = [...project.presets];
            newPresets.splice(parseInt(req.params.index), 1);
            project.presets = newPresets;
            await project.save();
            return res.status(200).send({ success: true });
        }
        return res.status(404).send({ error: 'Project or presets not found' });
    } catch (e) {
        console.error(e);
        res.status(400).send({error: 'Unable to delete preset'});
    }
})

// update presets
router.put(baseUrl+'project/:projectId/presets', authMiddleware, async (req, res) => {
    const projectId = req.params.projectId

    try {
        const project = await ArProject.findOne({
            where: { id: projectId },
        })

        if(!project)
            return res.status(404).send({ error: 'No project found'});

        if (project.userId !== req.user.id && !req.user.admin)
            return res.status(403).send({error: "User not granted"})

        await project.update({
            presets: req.body.presets
        })

        return res.status(200).send(project)

    } catch(e) {
        console.error(e);
        res.status(400).send({error: 'Unable to update presets'});
    }
})

export default router
