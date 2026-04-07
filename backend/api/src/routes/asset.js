import express from "express";
import { baseUrl } from "./baseUrl.js";
import authMiddleware, { optionnalAuthMiddleware } from "../middlewares/auth.js";
import { ArAsset, ArScene, ArProject, ArUser, ArMesh, ArLabel } from "../orm/index.js";
import { deleteAsset, adminUploadAsset } from "../utils/fileUpload.js";
import { Sequelize, Op } from "sequelize";
import { sequelize } from "../orm/database.js";
import {computeAssetMetrics, computeAssetPolicy, computeGeometryMetricsFromFile, computeFileSizeBytes} from "../socket/utils/assetMetrics.js";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";

const router = express.Router();

// Prevent concurrent simplify jobs on same asset
const activeSimplifyJobs = new Set();

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

function ensureParentDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function safeUnlink(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch {}
}

function withDefaultMetricShape(metrics = {}) {
    return {
        assetSizeBytes: metrics.assetSizeBytes ?? null,
        triangleCount: metrics.triangleCount ?? null,
        vertexCount: metrics.vertexCount ?? null,
        meshCount: metrics.meshCount ?? null,
    };
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
/*
const LOD_PRESETS = {
    n1: { ratio: 0.75, error: 0.001 },
    n2: { ratio: 0.50, error: 0.005 },
    n3: { ratio: 0.25, error: 0.01 },
};
*/


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

async function runWeld({
                           gltfTransformCmd,
                           apiRoot,
                           inputDisk,
                           outputDisk,
                       }) {
    ensureParentDir(outputDisk);

    const args = ["weld", inputDisk, outputDisk];

    console.log("[WELD] input =", inputDisk);
    console.log("[WELD] output =", outputDisk);

    await run(gltfTransformCmd, args, apiRoot);

    if (!fileExists(outputDisk)) {
        throw new Error(`weld did not produce output file: ${outputDisk}`);
    }
}

async function runSimplifyLevel({
                                    gltfTransformCmd,
                                    apiRoot,
                                    inputDisk,
                                    outputDisk,
                                    ratio,
                                    error,
                                    lockBorder = false,
                                }) {
    ensureParentDir(outputDisk);

    const args = [
        "simplify",
        inputDisk,
        outputDisk,
        "--ratio", String(ratio),
        "--error", String(error),
        "--lock-border", String(lockBorder),
    ];

    console.log("[SIMPLIFY LEVEL] ratio =", ratio, "error =", error);
    console.log("[SIMPLIFY LEVEL] input =", inputDisk);
    console.log("[SIMPLIFY LEVEL] output =", outputDisk);

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
        const policy = computeAssetPolicy(metrics);
        const variants = buildVariantSet(asset, apiRoot);
        console.log("[MANIFEST TYPE]", typeof asset.lodMeta, asset.lodMeta);
        let parsedLodMeta = null;

        try {
            parsedLodMeta =
                typeof asset.lodMeta === "string"
                    ? JSON.parse(asset.lodMeta)
                    : asset.lodMeta;
        } catch (e) {
            console.warn("[lodMeta parse failed]", e);
        }
        console.log("[MANIFEST] req.user =", req.user);
        console.log("[MANIFEST] ownerId =", ownerId);
        console.log("[MANIFEST] published =", project?.published);
        return res.status(200).send({
            assetId: asset.id,
            revision: asset.updatedAt ? new Date(asset.updatedAt).toISOString() : null,
            preferredVariant: asset.preferredVariant ?? "original",
            simplifyRatio: asset.simplifyRatio ?? null,
            variants,
            metrics,
            policy,
            lodMeta:parsedLodMeta,
        });
    } catch (e) {
        console.log("[ASSET MANIFEST ERROR]", e);
        return res.status(400).send({ error: "Unable to fetch manifest" });
    }

});

router.post(baseUrl + "assets/:assetId/simplify", authMiddleware, async (req, res) => {
    const token = req.user;
    const assetId = req.params.assetId;

    let weldedDisk = null;

    if (activeSimplifyJobs.has(assetId)) {
        return res.status(409).send({
            error: "Simplify already running for this asset",
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

        if (!asset.url) {
            return res.status(400).send({ error: "Asset url missing" });
        }

        const apiRoot = process.cwd();

        const inputRel = toInputRel(asset.url);
        const originalDisk = path.resolve(apiRoot, inputRel);

        if (!fileExists(originalDisk)) {
            return res.status(400).send({
                error: "Original file not found on disk",
                details: { inputRel, originalDisk, apiRoot },
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

        const originalMetrics = withDefaultMetricShape(
            await computeAssetMetrics(asset, apiRoot)
        );

        // ERROR-ONLY presets
        const presets = {
            n1: { ratio: 0, error: 0.001 },
            n2: { ratio: 0, error: 0.005 },
            n3: { ratio: 0, error: 0.02 },
        };

        const n1Rel = makeVariantRel(inputRel, "n1");
        const n2Rel = makeVariantRel(inputRel, "n2");
        const n3Rel = makeVariantRel(inputRel, "n3");

        const n1Disk = path.resolve(apiRoot, n1Rel);
        const n2Disk = path.resolve(apiRoot, n2Rel);
        const n3Disk = path.resolve(apiRoot, n3Rel);

        console.log("[LOD generation] request received for asset", assetId);
        console.log("[LOD generation] original:", originalDisk);
        console.log("[LOD generation] presets:", presets);

        safeUnlink(n1Disk);
        safeUnlink(n2Disk);
        safeUnlink(n3Disk);

        const tmpDir = path.join(apiRoot, ".tmp-lod");
        fs.mkdirSync(tmpDir, { recursive: true });
        weldedDisk = path.join(tmpDir, `${asset.id}-${Date.now()}-welded.glb`);

        await runWeld({
            gltfTransformCmd,
            apiRoot,
            inputDisk: originalDisk,
            outputDisk: weldedDisk,
        });

        await runSimplifyLevel({
            gltfTransformCmd,
            apiRoot,
            inputDisk: weldedDisk,
            outputDisk: n1Disk,
            ratio: presets.n1.ratio,
            error: presets.n1.error,
        });

        await runSimplifyLevel({
            gltfTransformCmd,
            apiRoot,
            inputDisk: weldedDisk,
            outputDisk: n2Disk,
            ratio: presets.n2.ratio,
            error: presets.n2.error,
        });

        await runSimplifyLevel({
            gltfTransformCmd,
            apiRoot,
            inputDisk: weldedDisk,
            outputDisk: n3Disk,
            ratio: presets.n3.ratio,
            error: presets.n3.error,
        });

        const n1Metrics = withDefaultMetricShape(
            await computeGeometryMetricsFromFile(n1Disk)
        );
        const n2Metrics = withDefaultMetricShape(
            await computeGeometryMetricsFromFile(n2Disk)
        );
        const n3Metrics = withDefaultMetricShape(
            await computeGeometryMetricsFromFile(n3Disk)
        );

        console.log("[N1 Metrics]", n1Metrics);
        console.log("[N2 Metrics]", n2Metrics);
        console.log("[N3 Metrics]", n3Metrics);

        asset.simplifiedUrl = n1Rel;
        asset.simplifyRatio = null;
        asset.preferredVariant = "simplified";

        asset.lodMeta = {
            generator: "gltf-transform",
            mode: "error-only",
            generatedAt: new Date().toISOString(),
            original: originalMetrics,
            variants: {
                n1: {
                    path: normalizePath(n1Rel),
                    requestedRatio: presets.n1.ratio,
                    requestedError: presets.n1.error,
                    resultingError: null,
                    ...n1Metrics,
                    status: fileExists(n1Disk) ? "ready" : "missing",
                },
                n2: {
                    path: normalizePath(n2Rel),
                    requestedRatio: presets.n2.ratio,
                    requestedError: presets.n2.error,
                    resultingError: null,
                    ...n2Metrics,
                    status: fileExists(n2Disk) ? "ready" : "missing",
                },
                n3: {
                    path: normalizePath(n3Rel),
                    requestedRatio: presets.n3.ratio,
                    requestedError: presets.n3.error,
                    resultingError: null,
                    ...n3Metrics,
                    status: fileExists(n3Disk) ? "ready" : "missing",
                },
            },
        };

        await asset.save();

        safeUnlink(weldedDisk);
        weldedDisk = null;

        const metrics = await computeAssetMetrics(asset, apiRoot);
        const policy = computeAssetPolicy(metrics);
        const variants = buildVariantSet(asset, apiRoot);

        console.log("[SIMPLIFY RESPONSE]", JSON.stringify({
            asset: {
                id: asset.id,
                simplifiedUrl: asset.simplifiedUrl,
                preferredVariant: asset.preferredVariant,
                simplifyRatio: asset.simplifyRatio,
            },
            lodMeta: asset.lodMeta,
        }, null, 2));

        return res.status(200).send({
            asset: {
                id: asset.id,
                url: asset.url,
                simplifiedUrl: asset.simplifiedUrl,
                preferredVariant: asset.preferredVariant,
                simplifyRatio: asset.simplifyRatio,
                lodMeta: asset.lodMeta,
            },
            lods: {
                n1: {
                    path: normalizePath(n1Rel),
                    ratio: presets.n1.ratio,
                    error: presets.n1.error,
                },
                n2: {
                    path: normalizePath(n2Rel),
                    ratio: presets.n2.ratio,
                    error: presets.n2.error,
                },
                n3: {
                    path: normalizePath(n3Rel),
                    ratio: presets.n3.ratio,
                    error: presets.n3.error,
                },
            },
            metrics,
            policy,
            variants,
            lodMeta: asset.lodMeta,
        });
    } catch (e) {
        console.log("[ASSET SIMPLIFY ERROR]", e);

        if (weldedDisk) {
            safeUnlink(weldedDisk);
        }

        return res.status(400).send({
            error: "Simplify failed",
            details: e?.message || String(e),
        });
    } finally {
        activeSimplifyJobs.delete(assetId);
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
                "simplifyRatio",
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
                simplifyRatio: null,
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