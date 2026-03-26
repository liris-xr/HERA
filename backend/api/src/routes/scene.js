import express from "express";
import { baseUrl } from "./baseUrl.js";
import { ArMesh, ArAsset, ArLabel, ArProject, ArScene, ArUser } from "../orm/index.js";
import authMiddleware from "../middlewares/auth.js";
import { sequelize } from "../orm/database.js";
import { Op, Sequelize } from "sequelize";
import { updateListById } from "../utils/updateListById.js";
import { deleteAsset, deleteFile, uploadEnvmapAndAssets } from "../utils/fileUpload.js";

const router = express.Router();

function asJson(val, fallback) {
    if (val == null) return fallback;
    if (typeof val === "object") return val;
    try { return JSON.parse(val); } catch { return fallback; }
}

function normalizeVariant(v) {
    const s = String(v ?? "").trim().toLowerCase();
    if (["original", "simplified", "n1", "n2", "n3"].includes(s)) return s;
    return "original";
}
function normalizeRatio(r) {
    const n = Number(r);
    if (!Number.isFinite(n)) return null;
    return Math.max(0.01, Math.min(1.0, n));
}
const normalizeUrl = (u) => String(u ?? "").replaceAll("\\", "/");

router.get(baseUrl + "scenes/:sceneId", authMiddleware, async (req, res) => {
    const sceneId = req.params.sceneId;
    const token = req.user;

    try {
        const scene = await ArScene.findOne({
            include: [
                { model: ArMesh, as: "meshes" },
                {
                    model: ArAsset,
                    as: "assets",
                    attributes: [
                        "id", "name", "url", "simplifiedUrl",
                        "preferredVariant", "simplifyRatio", "lodMeta",
                        "hideInViewer", "activeAnimation",
                        "position", "rotation", "scale",
                        "createdAt", "updatedAt",
                    ],
                },
                { model: ArLabel, as: "labels" },
                {
                    model: ArProject,
                    as: "project",
                    attributes: ["id", "title", "unit", "displayMode"],
                    include: [{ model: ArUser, as: "owner", attributes: ["id", "username"] }],
                },
            ],
            where: { id: sceneId },
        });

        res.set({ "Content-Type": "application/json" });

        if (!scene) return res.status(404).send({ error: "Scene not found" });
        if (scene.project.owner.id != token.id && !req.user.admin) {
            return res.status(403).send({ error: "User not granted" });
        }

        return res.status(200).send(scene);
    } catch (e) {
        console.log(e);
        return res.status(400).send({ error: "Unable to fetch scene" });
    }
});

/**
 * Middleware to extract projectId + currentAssetCount before upload
 */
const getPostUploadData = async (req, res, next) => {
    const sceneId = req.params.sceneId;

    const scene = await ArScene.findOne({
        include: [
            { model: ArAsset, as: "assets" },
            { model: ArProject, as: "project", attributes: ["id"] },
        ],
        where: { id: sceneId },
    });

    if (!scene) return res.status(404).send({ error: "Scene not found" });

    req.currentAssetCount = scene.assets.length;
    req.projectId = scene.project.id;
    next();
};

/**
 * PUT scenes/:sceneId
 * Upload files + update/create/delete labels/assets/meshes + update scene
 */
router.put(
    baseUrl + "scenes/:sceneId",
    authMiddleware,
    getPostUploadData,
    uploadEnvmapAndAssets.fields([
        { name: "uploadedEnvmap", maxCount: 1 },
        { name: "uploads", maxCount: 16 },
    ]),
    async (req, res) => {
        const token = req.user;
        const sceneId = req.params.sceneId;
        const uploadedUrl = req.uploadedUrl;

        const uploadedFilenames = (req.uploadedFilenames ?? []).map(normalizeUrl);

        try {
            const fetchScene = async () =>
                await ArScene.findOne({
                    include: [
                        { model: ArProject, as: "project", include: [{ model: ArUser, as: "owner", attributes: ["id"] }] },
                        { model: ArLabel, as: "labels" },
                        { model: ArAsset, as: "assets" },
                        { model: ArMesh, as: "meshes" },
                    ],
                    where: { id: sceneId },
                });

            let scene = await fetchScene();

            if (!scene) return res.status(404).send({ error: "Scene not found" });
            if (scene.project.owner.id != token.id && !req.user.admin) {
                return res.status(403).send({ error: "User not granted" });
            }

            const knownLabelsIds = scene.labels.map((l) => l.id);
            const knownAssetsIds = scene.assets.map((a) => a.id);

            const knownMeshes = scene.meshes.map((m) => ({ id: m.id, assetId: m.assetId }));

            const labelsBody = asJson(req.body.labels, []);
            const assetsBody = asJson(req.body.assets, []);
            const meshesBody = asJson(req.body.meshes, []);

            const vrStartPositionBody = asJson(req.body.vrStartPosition, scene.vrStartPosition ?? null);

            let assetsIdMatching = [];
            let insertedCount = 0;

            await sequelize.transaction(async (t) => {
                // LABELS
                if (req.body.labels != null) {
                    await updateListById(
                        knownLabelsIds,
                        labelsBody,
                        async (label) => {
                            await ArLabel.update(
                                {
                                    text: label.text,
                                    position: label.position,
                                    timestampStart: label.timestampStart,
                                    timestampEnd: label.timestampEnd,
                                },
                                { where: { id: label.id }, transaction: t }
                            );
                        },
                        async (label) => {
                            await ArLabel.create(
                                {
                                    text: label.text,
                                    position: label.position,
                                    sceneId: scene.id,
                                    timestampStart: label.timestampStart,
                                    timestampEnd: label.timestampEnd,
                                },
                                { transaction: t }
                            );
                        },
                        async (knownId) => {
                            await ArLabel.destroy({ where: { id: knownId }, transaction: t });
                        }
                    );
                }

                // ASSETS
                await updateListById(
                    knownAssetsIds,
                    assetsBody,

                    // UPDATE
                    async (asset) => {
                        await ArAsset.update(
                            {
                                position: asset.position,
                                rotation: asset.rotation,
                                scale: asset.scale,
                                hideInViewer: asset.hideInViewer,
                                activeAnimation: asset.activeAnimation,

                                preferredVariant: normalizeVariant(asset.preferredVariant),
                                simplifyRatio: normalizeRatio(asset.simplifyRatio),
                            },
                            { where: { id: asset.id }, transaction: t }
                        );
                    },

                    // CREATE
                    async (asset) => {
                        const data = {
                            position: asset.position,
                            rotation: asset.rotation,
                            scale: asset.scale,
                            sceneId: scene.id,
                            name: asset.name,
                            activeAnimation: asset.activeAnimation,
                            hideInViewer: asset.hideInViewer ?? false,

                            preferredVariant: normalizeVariant(asset.preferredVariant),
                            simplifyRatio: normalizeRatio(asset.simplifyRatio),
                            simplifiedUrl: null,
                        };

                        if (asset.copiedUrl) {
                            data.url = normalizeUrl(asset.copiedUrl);
                        } else {
                            const nextUploaded = uploadedFilenames[insertedCount];
                            if (!nextUploaded) {
                                throw new Error(
                                    `[SAVE] Missing uploaded filename for new asset "${asset.name}" (tempId=${asset.id}). ` +
                                    `uploads received=${uploadedFilenames.length}, insertedCount=${insertedCount}.`
                                );
                            }
                            data.url = normalizeUrl(nextUploaded);
                            insertedCount++;
                        }

                        const newAsset = await ArAsset.create(data, { transaction: t });
                        assetsIdMatching.push({ tempId: asset.id, newId: newAsset.id });
                    },

                    // DELETE
                    async (knownId) => {
                        const assetToDelete = await ArAsset.findOne({ where: { id: knownId }, transaction: t });
                        await deleteAsset(assetToDelete);
                        await assetToDelete.destroy({ transaction: t });
                    }
                );

                // MESHES
                const meshes = Array.isArray(meshesBody) ? meshesBody : [];

                // temp assetId -> new id
                const tempToNew = new Map(assetsIdMatching.map((m) => [m.tempId, m.newId]));
                for (const m of meshes) {
                    if (m?.assetId && tempToNew.has(m.assetId)) m.assetId = tempToNew.get(m.assetId);
                }

                // Skip invalid meshes
                const valid = meshes.filter((m) => m && m.id && m.assetId);

                const unique = new Map();
                for (const m of valid) unique.set(`${m.id}::${m.assetId}`, m);

                // Delete removed meshes
                const incomingKeys = new Set(unique.keys());
                for (const km of knownMeshes) {
                    const k = `${km.id}::${km.assetId}`;
                    if (!incomingKeys.has(k)) {
                        await ArMesh.destroy({ where: { id: km.id, assetId: km.assetId }, transaction: t });
                    }
                }

                for (const m of unique.values()) {
                    const payload = {
                        id: m.id,
                        assetId: m.assetId,
                        sceneId: scene.id,

                        name: m.name,
                        position: m.position,
                        rotation: m.rotation,
                        scale: m.scale,

                        color: m.color,
                        emissiveIntensity: m.emissiveIntensity,
                        emissive: m.emissive,
                        roughness: m.roughness,
                        metalness: m.metalness,
                        opacity: m.opacity,
                    };

                    const [updatedCount] = await ArMesh.update(payload, {
                        where: { id: m.id, assetId: m.assetId },
                        transaction: t,
                    });
                    if (updatedCount === 0) await ArMesh.create(payload, { transaction: t });
                }

                // ENVMAP
                let updatedEnvmapUrl = uploadedUrl;
                if (uploadedUrl && scene.envmapUrl) {
                    deleteFile(scene.envmapUrl);
                    updatedEnvmapUrl = uploadedUrl;
                }

                // UPDATE SCENE
                await ArScene.update(
                    {
                        title: req.body.title,
                        description: req.body.description,
                        envmapUrl: updatedEnvmapUrl || req.body.envmapUrl,
                        vrStartPosition: vrStartPositionBody,
                    },
                    { where: { id: sceneId }, transaction: t }
                );
            });

            scene = await fetchScene();

            res.set({ "Content-Type": "application/json" });
            return res.status(200).send({ scene, assetsIdMatching });
        } catch (e) {
            console.log("[SAVE SCENE ERROR]", e);
            const details = e?.original?.message || e?.parent?.message || e?.message || String(e);

            res.set({ "Content-Type": "application/json" });
            return res.status(400).send({ error: "Unable to save scene", details });
        }
    }
);
const SCENES_PAGE_LENGTH = 10;

// Sans page -> page = 1
router.get(baseUrl + "admin/scenes", authMiddleware, async (req, res) => {
    req.params.page = "1";
    return adminScenesHandler(req, res);
});

// Avec page explicite
router.get(baseUrl + "admin/scenes/:page", authMiddleware, async (req, res) => {
    return adminScenesHandler(req, res);
});

async function adminScenesHandler(req, res) {
    const token = req.user;
    const page = parseInt(req.params.page) || 1;

    if (!token.admin) {
        return res.status(403).send({ error: "User not granted" });
    }

    try {
        const where = {};
        const whereProject = {};

        if (req.query?.title) {
            where.title = {
                [Op.like]: `%${req.query.title}%`
            };
        }

        if (req.query["project.title"]) {
            whereProject.title = {
                [Op.like]: `%${req.query["project.title"]}%`
            };
        }

        const rows = await ArScene.findAll({
            subQuery: false,
            include: [
                {
                    model: ArMesh,
                    separate: true,
                    as: "meshes"
                },
                {
                    model: ArAsset,
                    separate: true,
                    as: "assets",
                    attributes: [
                        "id", "name", "url", "simplifiedUrl",
                        "preferredVariant", "simplifyRatio", "lodMeta",
                        "hideInViewer", "activeAnimation",
                        "position", "rotation", "scale",
                        "createdAt", "updatedAt",
                    ],
                },
                {
                    model: ArLabel,
                    separate: true,
                    as: "labels",
                },
                {
                    model: ArProject,
                    as: "project",
                    attributes: ["id", "title", "unit", "displayMode"],
                    where: whereProject,
                    include: [
                        {
                            model: ArUser,
                            as: "owner",
                            attributes: ["id", "username"]
                        }
                    ]
                }
            ],
            order: [["createdAt", "ASC"]],
            limit: SCENES_PAGE_LENGTH,
            offset: (page - 1) * SCENES_PAGE_LENGTH,
            where
        });

        const count = await ArScene.count({ where });

        return res.status(200).send({
            scenes: rows,
            totalPages: Math.ceil(count / SCENES_PAGE_LENGTH),
            currentPage: page,
        });
    } catch (e) {
        console.log(e);
        return res.status(400).send({ error: "Unable to fetch scenes" });
    }
}
export default router;