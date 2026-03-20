import express from "express";
import { baseUrl } from "./baseUrl.js";
import authMiddleware, { optionnalAuthMiddleware } from "../middlewares/auth.js";
import { ArAsset, ArScene, ArProject, ArUser, ArMesh, ArLabel } from "../orm/index.js";
import { deleteAsset , adminUploadAsset} from "../utils/fileUpload.js";
import { Sequelize , Op} from "sequelize";
import { sequelize } from "../orm/database.js";
import { computeAssetMetrics, computeAssetPolicy } from "../socket/utils/assetMetrics.js";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";

const router = express.Router();

const normalizePath = (p) => {
    if (!p) return null;
    const s = String(p).replaceAll("\\", "/").trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    return s.startsWith("/") ? s : `/${s}`;
};

function normalizeRatio(r) {
    const n = Number(r);
    if (!Number.isFinite(n)) return 0.25;
    return Math.max(0.01, Math.min(1.0, n));
}

function ratioTag(r) {
    return `r${Math.round(r * 100)}`; // 0.25 -> r25
}

function fileExists(p) {
    try {
        fs.accessSync(p);
        return true;
    } catch {
        return false;
    }
}

function run(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            cwd,
            shell: process.platform === "win32",
            windowsHide: true,
        });

        let out = "";
        let err = "";
        child.stdout.on("data", (d) => (out += d.toString()));
        child.stderr.on("data", (d) => (err += d.toString()));
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) return resolve({ out, err });
            reject(new Error(`command failed (code=${code})\n${err || out}`));
        });
    });
}

function toInputRel(url) {
    return String(url ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
}

/**
 * Build a new variant path from the original asset relative path.
 * Example:
 *   uploads/a.glb + "n1" -> uploads/a_n1.glb
 */
function makeVariantRel(inputRel, suffix) {
    const dirRel = path.posix.dirname(inputRel);
    const base = path.posix.basename(inputRel, path.posix.extname(inputRel));
    const ext = path.posix.extname(inputRel) || ".glb";
    return path.posix.join(dirRel, `${base}_${suffix}${ext}`);
}

function buildVariantSet(asset, apiRoot) {
    const originalRel = toInputRel(asset?.url);
    if (!originalRel) {
        return {
            original: { status: "missing", path: null },
            simplified: { status: "missing", path: null },
            n1: { status: "missing", path: null },
            n2: { status: "missing", path: null },
            n3: { status: "missing", path: null },
        };
    }

    const originalDisk = path.resolve(apiRoot, originalRel);
    const n1Rel = makeVariantRel(originalRel, "n1");
    const n2Rel = makeVariantRel(originalRel, "n2");
    const n3Rel = makeVariantRel(originalRel, "n3");

    const n1Disk = path.resolve(apiRoot, n1Rel);
    const n2Disk = path.resolve(apiRoot, n2Rel);
    const n3Disk = path.resolve(apiRoot, n3Rel);

    const originalPath = normalizePath(originalRel);
    const n1Path = normalizePath(n1Rel);
    const n2Path = normalizePath(n2Rel);
    const n3Path = normalizePath(n3Rel);

    const originalReady = fileExists(originalDisk);
    const n1Ready = fileExists(n1Disk);
    const n2Ready = fileExists(n2Disk);
    const n3Ready = fileExists(n3Disk);

    return {
        original: {
            status: originalReady ? "ready" : "missing",
            path: originalReady ? originalPath : null,
        },
        // backward compatibility: simplified points to N1
        simplified: {
            status: n1Ready ? "ready" : "missing",
            path: n1Ready ? n1Path : null,
        },
        n1: {
            status: n1Ready ? "ready" : "missing",
            path: n1Ready ? n1Path : null,
        },
        n2: {
            status: n2Ready ? "ready" : "missing",
            path: n2Ready ? n2Path : null,
        },
        n3: {
            status: n3Ready ? "ready" : "missing",
            path: n3Ready ? n3Path : null,
        },
    };
}

async function runSimplifyLevel({
                                    gltfTransformCmd,
                                    apiRoot,
                                    inputDisk,
                                    outputDisk,
                                    ratio,
                                }) {
    const args = ["simplify", inputDisk, outputDisk, "--ratio", String(ratio)];

    console.log("[SIMPLIFY LEVEL] ratio=", ratio);
    console.log("[SIMPLIFY LEVEL] input =", inputDisk);
    console.log("[SIMPLIFY LEVEL] output=", outputDisk);

    await run(gltfTransformCmd, args, apiRoot);

    if (!fileExists(outputDisk)) {
        throw new Error(`simplify did not produce output file: ${outputDisk}`);
    }
}

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
        if (!asset) return res.status(404).send({ error: "Asset not found" });

        const project = asset.scene?.project;
        const ownerId = project?.owner?.id;

        const isPublic = project?.published === true;
        const isOwner = !!req.user && (req.user.admin || req.user.id === ownerId);

        if (!isPublic && !isOwner) {
            return res.status(403).send({ error: "Forbidden" });
        }

        const apiRoot = process.cwd();
        const metrics = computeAssetMetrics(asset, apiRoot);
        const policy = computeAssetPolicy(metrics);
        const variants = buildVariantSet(asset, apiRoot);

        return res.status(200).send({
            assetId: asset.id,
            revision: asset.updatedAt ? new Date(asset.updatedAt).toISOString() : null,

            // keep old fields for compatibility
            preferredVariant: asset.preferredVariant ?? "original",
            simplifyRatio: asset.simplifyRatio ?? null,

            // new richer set
            variants,
            metrics,
            policy,
        });
    } catch (e) {
        console.log("[ASSET MANIFEST ERROR]", e);
        return res.status(400).send({ error: "Unable to fetch manifest" });
    }
});

router.post(baseUrl + "assets/:assetId/simplify", authMiddleware, async (req, res) => {
    const token = req.user;
    const assetId = req.params.assetId;

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
        if (!asset) return res.status(404).send({ error: "Asset not found" });

        const ownerId = asset.scene?.project?.owner?.id;
        if (ownerId !== token.id && !req.user.admin) {
            return res.status(403).send({ error: "User not granted" });
        }

        if (!asset.url) return res.status(400).send({ error: "Asset url missing" });

        const apiRoot = process.cwd();

        const inputRel = toInputRel(asset.url);
        const inputDisk = path.resolve(apiRoot, inputRel);

        if (!fileExists(inputDisk)) {
            return res.status(400).send({
                error: "Original file not found on disk",
                details: { inputRel, inputDisk, apiRoot },
            });
        }

        const gltfTransformCmd =
            process.platform === "win32"
                ? path.join(apiRoot, "node_modules", ".bin", "gltf-transform.cmd")
                : path.join(apiRoot, "node_modules", ".bin", "gltf-transform");

        if (!fileExists(gltfTransformCmd)) {
            return res.status(400).send({
                error: "gltf-transform not found",
                details: { gltfTransformCmd },
            });
        }

        // Heuristic N1 from current metric/policy
        const metrics = computeAssetMetrics(asset, apiRoot);
        const policy = computeAssetPolicy(metrics);

        // optional manual override for N1 if sent
        const manualRatio =
            req.body?.ratio != null ? normalizeRatio(req.body.ratio) : null;

        const n1Ratio = manualRatio ?? normalizeRatio(policy?.recommendedSimplifyRatio ?? 0.25);
        const n2Ratio = 0.25;
        const n3Ratio = 0.25;

        const n1Rel = makeVariantRel(inputRel, "n1");
        const n2Rel = makeVariantRel(inputRel, "n2");
        const n3Rel = makeVariantRel(inputRel, "n3");

        const n1Disk = path.resolve(apiRoot, n1Rel);
        const n2Disk = path.resolve(apiRoot, n2Rel);
        const n3Disk = path.resolve(apiRoot, n3Rel);

        console.log("[LOD generation] request received for asset", assetId);
        console.log("[LOD generation] input original:", inputDisk);
        console.log("[LOD generation] N1 ratio:", n1Ratio, "->", n1Disk);
        console.log("[LOD generation] N2 ratio:", n2Ratio, "->", n2Disk);
        console.log("[LOD generation] N3 ratio:", n3Ratio, "->", n3Disk);

        // N1 from original using heuristic
        await runSimplifyLevel({
            gltfTransformCmd,
            apiRoot,
            inputDisk,
            outputDisk: n1Disk,
            ratio: n1Ratio,
        });

        // N2 from N1
        await runSimplifyLevel({
            gltfTransformCmd,
            apiRoot,
            inputDisk: n1Disk,
            outputDisk: n2Disk,
            ratio: n2Ratio,
        });

        // N3 from N2
        await runSimplifyLevel({
            gltfTransformCmd,
            apiRoot,
            inputDisk: n2Disk,
            outputDisk: n3Disk,
            ratio: n3Ratio,
        });

        asset.simplifiedUrl = n1Rel;
        asset.simplifyRatio = n1Ratio;
        asset.preferredVariant = "simplified";
        await asset.save();

        const variants = buildVariantSet(asset, apiRoot);

        return res.status(200).send({
            asset: {
                id: asset.id,
                url: asset.url,
                simplifiedUrl: asset.simplifiedUrl,
                preferredVariant: asset.preferredVariant,
                simplifyRatio: asset.simplifyRatio,
            },
            lods: {
                n1: { path: normalizePath(n1Rel), ratio: n1Ratio },
                n2: { path: normalizePath(n2Rel), ratio: n2Ratio },
                n3: { path: normalizePath(n3Rel), ratio: n3Ratio },
            },
            metrics,
            policy,
            variants,
        });
    } catch (e) {
        console.log("[ASSET SIMPLIFY ERROR]", e);
        return res.status(400).send({
            error: "Simplify failed",
            details: e?.message || String(e),
        });
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

// Sans page -> page = 1
router.get(baseUrl + "admin/assets", authMiddleware, async (req, res) => {
    req.params.page = "1";
    return adminAssetsHandler(req, res);
});

// Avec page explicite
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
                "simplifyRatio",
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
                simplifyRatio: null,
            });

            return res.status(200).send(newAsset);
        } catch (e) {
            console.log(e);
            return res.status(400).send({ error: "Unable to save asset" });
        }
    }
);
export default router;