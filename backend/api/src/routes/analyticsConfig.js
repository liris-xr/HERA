import express from 'express'
import { baseUrl } from "./baseUrl.js";
import authMiddleware from "../middlewares/auth.js";
import { ArAnalyticsConfig } from "../orm/index.js";

const router = express.Router()

/**
 * GET /api/config/analytics
 * Retourne la configuration des intervalles de traces.
 */
router.get(baseUrl + 'config/analytics', async (req, res) => {
    try {
        let config = await ArAnalyticsConfig.findOne();
        if (!config) {
            config = await ArAnalyticsConfig.create({
                recordTimerMs: 2000,
                sendRecordsTimerMs: 30000
            });
        }
        return res.status(200).json({
            recordTimerMs: config.recordTimerMs,
            sendRecordsTimerMs: config.sendRecordsTimerMs
        });
    } catch (e) {
        return res.status(500).json({ error: 'Erreur serveur', details: e.message });
    }
})

/**
 * PUT /api/config/analytics
 * Met à jour la configuration des intervalles de traces (admin uniquement).
 */
router.put(baseUrl + 'config/analytics', authMiddleware, async (req, res) => {
    const authUser = req.user
    if (!authUser.admin) {
        return res.status(401).json({ error: 'Unauthorized', details: 'Permission not granted' })
    }

    const { recordTimerMs, sendRecordsTimerMs } = req.body

    if (recordTimerMs === undefined || sendRecordsTimerMs === undefined) {
        return res.status(400).json({ error: 'Bad Request', details: 'recordTimerMs and sendRecordsTimerMs are required' })
    }

    if (typeof recordTimerMs !== 'number' || recordTimerMs < 1 ||
        typeof sendRecordsTimerMs !== 'number' || sendRecordsTimerMs < 1) {
        return res.status(400).json({ error: 'Bad Request', details: 'Values must be positive numbers' })
    }

    try {
        let config = await ArAnalyticsConfig.findOne();
        if (!config) {
            config = await ArAnalyticsConfig.create({ recordTimerMs, sendRecordsTimerMs });
        } else {
            await config.update({ recordTimerMs, sendRecordsTimerMs });
        }
        return res.status(200).json({
            recordTimerMs: config.recordTimerMs,
            sendRecordsTimerMs: config.sendRecordsTimerMs
        });
    } catch (e) {
        return res.status(500).json({ error: 'Erreur serveur', details: e.message });
    }
})

export default router

