import express from "express";
import { baseUrl } from "./baseUrl.js";
import authMiddleware, {optionnalAuthMiddleware} from "../middlewares/auth.js";
import {ArAsset, ArScene, ArProject, ArUser, ArMesh, ArLabel} from "../orm/index.js";
import {deleteAsset} from "../utils/fileUpload.js";
import {Sequelize} from "sequelize";
import {sequelize} from "../orm/database.js";
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

        const original = normalizePath(asset.url);
        const simplified = normalizePath(asset.simplifiedUrl);

        return res.status(200).send({
            assetId: asset.id,
            revision: asset.updatedAt ? new Date(asset.updatedAt).toISOString() : null,
            preferredVariant: asset.preferredVariant ?? "original",
            simplifyRatio: asset.simplifyRatio ?? null,
            variants: {
                original:   { status: original ? "ready" : "missing", path: original },
                simplified: { status: simplified ? "ready" : "missing", path: simplified },
            },
        });
    } catch (e) {
        console.log("[ASSET MANIFEST ERROR]", e);
        return res.status(400).send({ error: "Unable to fetch manifest" });
    }
});

function normalizeRatio(r) {
    const n = Number(r);
    if (!Number.isFinite(n)) return 0.25;
    return Math.max(0.01, Math.min(1.0, n));
}

function ratioTag(r) {
    return `r${Math.round(r * 100)}`; // 0.25 -> r25
}

function fileExists(p) {
    try { fs.accessSync(p); return true; } catch { return false; }
}

function run(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            cwd,
            shell: process.platform === "win32", // IMPORTANT for .cmd
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

router.post(baseUrl + "assets/:assetId/simplify", authMiddleware, async (req, res) => {
    const token = req.user;
    const assetId = req.params.assetId;
    const ratio = normalizeRatio(req.body?.ratio ?? 0.25);

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

        const inputRel = String(asset.url).replaceAll("\\", "/").replace(/^\/+/, "");
        const inputDisk = path.resolve(apiRoot, inputRel);

        if (!fileExists(inputDisk)) {
            return res.status(400).send({
                error: "Original file not found on disk",
                details: { inputRel, inputDisk, apiRoot },
            });
        }

        const dirRel = path.posix.dirname(inputRel);
        const base = path.posix.basename(inputRel, path.posix.extname(inputRel));
        const ext = path.posix.extname(inputRel) || ".glb";

        const outRel = path.posix.join(dirRel, `${base}_${ratioTag(ratio)}${ext}`);
        const outDisk = path.resolve(apiRoot, outRel);

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

        const args = ["simplify", inputDisk, outDisk, "--ratio", String(ratio)];

        //console.log("[SIMPLIFY] args", args);

        console.log("[SIMPLIFY BACKEND] request received for asset", assetId, "ratio=", ratio);
        console.log("[SIMPLIFY BACKEND] input:", inputDisk);
        console.log("[SIMPLIFY BACKEND] output:", outDisk);

        await run(gltfTransformCmd, args, apiRoot);

        console.log("[SIMPLIFY BACKEND] simplify finished successfully");

        if (!fileExists(outDisk)) {
            return res.status(400).send({
                error: "simplify did not produce output file",
                details: { outRel, outDisk },
            });
        }

        asset.simplifiedUrl = outRel;
        asset.simplifyRatio = ratio;
        asset.preferredVariant = "simplified";
        await asset.save();

        return res.status(200).send({
            asset: {
                id: asset.id,
                url: asset.url,
                simplifiedUrl: asset.simplifiedUrl,
                preferredVariant: asset.preferredVariant,
                simplifyRatio: asset.simplifyRatio,
            },
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

        // max index
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
            // Optionnel: si ton modèle attend vrStartPosition
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
            // delete meshes
            await ArMesh.destroy({ where: { sceneId }, transaction: t });

            // delete labels
            await ArLabel.destroy({ where: { sceneId }, transaction: t });

            // delete assets + files
            for (const asset of scene.assets) {
                await deleteAsset(asset); // delete files on disk
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
export default router;