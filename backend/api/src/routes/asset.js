import express from "express";
import { baseUrl } from "./baseUrl.js";
import authMiddleware, { optionnalAuthMiddleware } from "../middlewares/auth.js";
import { ArAsset, ArScene, ArProject, ArUser, ArMesh, ArLabel } from "../orm/index.js";
import { deleteAsset, adminUploadAsset } from "../utils/fileUpload.js";
import { Sequelize, Op } from "sequelize";
import { sequelize } from "../orm/database.js";
import { computeAssetMetrics } from "../socket/utils/assetMetrics.js";
import { processAsset } from "../services/assetProcessing/processAsset.js";
import {buildVariantSet} from "../services/gltf/variantSet.js";

const router = express.Router();

// Prevent concurrent simplify jobs on same asset
const activeSimplifyJobs = new Set();
const activeProcessJobs = new Set();

router.get(baseUrl + "assets/:assetId/manifest", optionnalAuthMiddleware, async (req, res) => {
    const assetId = req.params.assetId;

    try {
        const asset = await ArAsset.findOne({
            where: { id: assetId },
            include: [
                {
                    model: ArScene,
                    as: "scene",
                    include: [
                        {
                            model: ArProject,
                            as: "project",
                            attributes: ["id", "published"],
                            include: [{ model: ArUser, as: "owner", attributes: ["id"] }],
                        },
                    ],
                },
            ],
        });

        res.set({ "Content-Type": "application/json" });

        if (!asset) {
            return res.status(404).send({ error: "Asset not found" });
        }

        const project = asset.scene?.project;
        const ownerId = project?.owner?.id;

        const isPublic = project?.published === true;
        const isOwner = !!req.user && (req.user.admin || req.user.id === ownerId);

        if (!isPublic && !isOwner) {
            return res.status(403).send({ error: "Forbidden" });
        }

        const apiRoot = process.cwd();
        const metrics = await computeAssetMetrics(asset, apiRoot);
        const variants = buildVariantSet(asset, apiRoot);

        let parsedLodMeta = null;
        try {
            parsedLodMeta =
                typeof asset.lodMeta === "string"
                    ? JSON.parse(asset.lodMeta)
                    : asset.lodMeta;
        } catch (e) {
            console.warn("[lodMeta parse failed]", e);
        }

        return res.status(200).send({
            assetId: asset.id,
            revision: asset.updatedAt ? new Date(asset.updatedAt).toISOString() : null,
            preferredVariant: asset.preferredVariant ?? "original",
            variants,
            metrics,
            lodMeta: parsedLodMeta,
        });
    } catch (e) {
        console.log("[ASSET MANIFEST ERROR]", e);
        return res.status(400).send({ error: "Unable to fetch manifest" });
    }
});

router.post(baseUrl + "assets/:assetId/simplify", authMiddleware, async (req, res) => {
    const token = req.user;
    const assetId = req.params.assetId;

    if (activeSimplifyJobs.has(assetId)) {
        return res.status(409).send({
            error: "Simplify already running for this asset ",
        });
    }

    activeSimplifyJobs.add(assetId);

    try {
        const asset = await ArAsset.findOne({
            where: { id: assetId },
            include: [{
                model: ArScene,
                as: "scene",
                include: [{
                    model: ArProject,
                    as: "project",
                    include: [{ model: ArUser, as: "owner", attributes: ["id"] }],
                }],
            }],
        });

        res.set({ "Content-Type": "application/json" });

        if (!asset) {
            return res.status(404).send({ error: "Asset not found" });
        }

        const ownerId = asset.scene?.project?.owner?.id;
        if (ownerId !== token.id && !req.user.admin) {
            return res.status(403).send({ error: "User not granted" });
        }

        const apiRoot = process.cwd();

        const result = await processAsset({
            asset,
            strategy: "simplify",
            params: {
                targetTriangles: {
                    n1: 120000,
                    n2: 60000,
                    n3: 25000,
                },
            },
            apiRoot,
        });

        return res.status(200).send(result);
    } catch (e) {
        console.log("[ASSET SIMPLIFY ERROR]", e);
        return res.status(400).send({
            error: "Simplify failed",
            details: e?.message || String(e),
        });
    } finally {
        activeSimplifyJobs.delete(assetId);
    }
});
router.post(baseUrl + "assets/:assetId/process", authMiddleware, async (req, res) => {
    const token = req.user;
    const assetId = req.params.assetId;
    const strategy = req.body?.strategy;

    if (activeProcessJobs.has(assetId)) {
        return res.status(409).send({
            error: "Process already running for this asset",
        });
    }

    activeProcessJobs.add(assetId);

    try {
        const asset = await ArAsset.findOne({
            where: { id: assetId },
            include: [{
                model: ArScene,
                as: "scene",
                include: [{
                    model: ArProject,
                    as: "project",
                    include: [{ model: ArUser, as: "owner", attributes: ["id"] }],
                }],
            }],
        });

        res.set({ "Content-Type": "application/json" });

        if (!asset) {
            return res.status(404).send({ error: "Asset not found" });
        }

        const ownerId = asset.scene?.project?.owner?.id;
        if (ownerId !== token.id && !req.user.admin) {
            return res.status(403).send({ error: "User not granted" });
        }

        if (!strategy) {
            return res.status(400).send({ error: "Missing strategy" });
        }

        const apiRoot = process.cwd();

        const result = await processAsset({
            asset,
            strategy,
            params: req.body?.params ?? {},
            apiRoot,
        });

        return res.status(200).send(result);
    } catch (e) {
        console.log("[ASSET PROCESS ERROR]", e);
        return res.status(400).send({
            error: "Process failed",
            details: e?.message || String(e),
        });
    } finally {
        activeProcessJobs.delete(assetId);
    }
});

router.post(baseUrl + "scenes", authMiddleware, async (req, res) => {
    const token = req.user;

    try {
        const { title, projectId } = req.body ?? {};
        res.set({ "Content-Type": "application/json" });

        if (!title || !projectId) {
            return res.status(400).send({ error: "Missing title or projectId" });
        }

        const project = await ArProject.findOne({
            where: { id: projectId },
            include: [{ model: ArUser, as: "owner", attributes: ["id"] }],
        });

        if (!project) return res.status(404).send({ error: "Project not found" });
        if (project.owner.id != token.id && !req.user.admin) {
            return res.status(403).send({ error: "User not granted" });
        }

        const projectScenesIndexes = await ArScene.findOne({
            where: { projectId },
            attributes: [[Sequelize.fn("MAX", Sequelize.col("index")), "maxIndex"]],
            raw: true,
        });

        let newIndex = 0;
        if (projectScenesIndexes?.maxIndex !== null && projectScenesIndexes?.maxIndex !== undefined) {
            newIndex = Number(projectScenesIndexes.maxIndex) + 1;
        }

        const newScene = await ArScene.create({
            title,
            projectId,
            index: newIndex,
            vrStartPosition: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
            },
        });

        return res.status(200).send(newScene);
    } catch (e) {
        console.log("[CREATE SCENE ERROR]", e);
        res.set({ "Content-Type": "application/json" });
        return res.status(400).send({ error: "Unable to create scene" });
    }
});

router.delete(baseUrl + "scenes/:sceneId", authMiddleware, async (req, res) => {
    const token = req.user;
    const sceneId = req.params.sceneId;

    try {
        const scene = await ArScene.findOne({
            include: [
                {
                    model: ArProject,
                    as: "project",
                    attributes: ["id"],
                    include: [{ model: ArUser, as: "owner", attributes: ["id"] }],
                },
                { model: ArAsset, as: "assets" },
            ],
            where: { id: sceneId },
        });

        res.set({ "Content-Type": "application/json" });

        if (!scene) return res.status(404).send({ error: "Scene not found" });
        if (scene.project.owner.id != token.id && !req.user.admin) {
            return res.status(403).send({ error: "User not granted" });
        }

        await sequelize.transaction(async (t) => {
            await ArMesh.destroy({ where: { sceneId }, transaction: t });
            await ArLabel.destroy({ where: { sceneId }, transaction: t });

            for (const asset of scene.assets) {
                await deleteAsset(asset);
                await ArAsset.destroy({ where: { id: asset.id }, transaction: t });
            }

            await scene.destroy({ transaction: t });
        });

        return res.status(200).send({ ok: true });
    } catch (e) {
        console.log("[DELETE SCENE ERROR]", e);
        const details = e?.original?.message || e?.parent?.message || e?.message || String(e);

        res.set({ "Content-Type": "application/json" });
        return res.status(400).send({ error: "Unable to delete scene", details });
    }
});

const ASSETS_PAGE_LENGTH = 10;

router.get(baseUrl + "admin/assets", authMiddleware, async (req, res) => {
    req.params.page = "1";
    return adminAssetsHandler(req, res);
});

router.get(baseUrl + "admin/assets/:page", authMiddleware, async (req, res) => {
    return adminAssetsHandler(req, res);
});

async function adminAssetsHandler(req, res) {
    const user = req.user;
    const page = parseInt(req.params.page) || 1;

    if (!user.admin) {
        return res.status(401).send({
            error: "Unauthorized",
            details: "User not granted"
        });
    }

    try {
        const where = {};
        const whereProject = {};

        if (req.query?.name) {
            where.name = {
                [Op.like]: `%${req.query.name}%`
            };
        }

        if (req.query["scene.project.title"]) {
            whereProject.title = {
                [Op.like]: `%${req.query["scene.project.title"]}%`
            };
        }

        const { count, rows } = await ArAsset.findAndCountAll({
            subQuery: false,
            attributes: [
                "id",
                "name",
                "hideInViewer",
                "url",
                "simplifiedUrl",
                "preferredVariant",
                "lodMeta",
                "activeAnimation",
                "position",
                "rotation",
                "scale",
                "createdAt",
                "updatedAt",
            ],
            limit: ASSETS_PAGE_LENGTH,
            offset: (page - 1) * ASSETS_PAGE_LENGTH,
            order: [["createdAt", "ASC"]],
            include: [
                {
                    model: ArScene,
                    as: "scene",
                    required: true,
                    include: [
                        {
                            model: ArProject,
                            as: "project",
                            where: whereProject,
                            required: true,
                        }
                    ]
                }
            ],
            where
        });

        return res.status(200).send({
            assets: rows,
            totalPages: Math.ceil(count / ASSETS_PAGE_LENGTH),
            currentPage: page,
        });
    } catch (e) {
        console.log(e);
        return res.status(400).send({ error: "Unable to fetch assets" });
    }
}

router.delete(baseUrl + "admin/assets/:assetId", authMiddleware, async (req, res) => {
    const authUser = req.user;
    const assetId = req.params.assetId;

    if (!authUser.admin) {
        return res.status(401).send({
            error: "Unauthorized",
            details: "User not granted"
        });
    }

    try {
        const asset = await ArAsset.findOne({
            where: { id: assetId },
        });

        if (!asset) {
            return res.status(404).send({ error: "Asset not found" });
        }

        await deleteAsset(asset);
        await asset.destroy();

        return res.status(200).send();
    } catch (e) {
        console.log(e);
        return res.status(400).send({ error: "Unable to delete asset" });
    }
});

router.put(baseUrl + "admin/assets/:assetId", authMiddleware, async (req, res) => {
    const authUser = req.user;
    const assetId = req.params.assetId;

    if (!authUser.admin) {
        return res.status(401).send({
            error: "Unauthorized",
            details: "User not granted"
        });
    }

    try {
        const asset = await ArAsset.findOne({
            where: { id: assetId },
        });

        if (!asset) {
            return res.status(404).send({ error: "Asset not found" });
        }

        await asset.update({
            name: req.body?.name,
            hideInViewer: req.body?.hideInViewer,
        }, {
            returning: true
        });

        return res.status(200).send(asset);
    } catch (e) {
        console.log(e);
        return res.status(400).send({ error: "Unable to save asset" });
    }
});

router.post(
    baseUrl + "admin/assets",
    authMiddleware,
    adminUploadAsset.single("asset"),
    async (req, res) => {
        const authUser = req.user;

        if (!authUser.admin) {
            return res.status(401).send({
                error: "Unauthorized",
                details: "User not granted"
            });
        }

        try {
            const fileUrl = req.uploadedFilenames?.[0];

            if (!fileUrl) {
                return res.status(400).send({ error: "Missing uploaded asset file" });
            }

            const newAsset = await ArAsset.create({
                name: req.body.name,
                hideInViewer: req.body?.hideInViewer,
                url: fileUrl,
                sceneId: req.body.sceneId,
                simplifiedUrl: null,
                preferredVariant: "original",
                lodMeta: null,
            });

            return res.status(200).send(newAsset);
        } catch (e) {
            console.log(e);
            return res.status(400).send({ error: "Unable to save asset" });
        }
    }
);

export default router;
