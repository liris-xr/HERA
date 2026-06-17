import express from "express";
import { baseUrl } from "./baseUrl.js";
import {
  ArMesh,
  ArAsset,
  ArLabel,
  ArProject,
  ArScene,
  ArUser,
} from "../orm/index.js";
import { sequelize } from "../orm/database.js";
import authMiddleware, {
  optionnalAuthMiddleware,
} from "../middlewares/auth.js";
import {
  deleteFile,
  deleteFolder,
  duplicateFolder,
  getProjectDirectory,
  getTempDirectory,
  getUpdatedPath,
  uploadCover,
  uploadProject,
} from "../utils/fileUpload.js";
import { Op } from "sequelize";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "url";
import decompress from "decompress";
import { updateUrl } from "../utils/updateUrl.js";
import multer from "multer";

// define dirname locally to avoid import issues
const __filename = fileURLToPath(import.meta.url);
const DIRNAME = path.join(path.dirname(__filename), "..", "..");

const router = express.Router();

const PAGE_LENGTH = 20;

const homeSettingsPath = path.join(
  DIRNAME,
  "public",
  "files",
  "home_settings.json",
);

router.get(
  baseUrl + "projects/:page",
  optionnalAuthMiddleware,
  async (req, res) => {
    const page = parseInt(req.params.page);
    try {
      let where = {};
      if (req.user)
        where = {
          [Op.or]: {
            published: true,
            userId: req.user.id,
          },
        };
      else where = { published: true };

      let projects = await ArProject.findAll({
        subQuery: false,
        attributes: [
          "id",
          "title",
          "pictureUrl",
          "updatedAt",
          "fav",
          "published",
          "userId",
          [sequelize.fn("COUNT", sequelize.col("scenes.id")), "sceneCount"],
        ],
        include: [
          {
            model: ArScene,
            as: "scenes",
            attributes: [],
          },
          {
            model: ArUser,
            as: "owner",
            attributes: ["username"],
          },
        ],
        where,
        group: ["ArProject.id"],
        limit: PAGE_LENGTH,
        offset: page * PAGE_LENGTH,
        order: [["updatedAt", "DESC"]],
      });
      res.set({
        "Content-Type": "application/json",
      });

      if (projects == null) {
        res.status(404);
        return res.send({ error: "unable to fetch projects" });
      } else {
        res.status(200);
        return res.send(projects);
      }
    } catch (e) {
      console.log(e);
      res.status(400);
      return res.send({ error: "incorrect query parameter : page" });
    }
  },
);

router.get(
  baseUrl + "project/:projectId",
  optionnalAuthMiddleware,
  async (req, res) => {
    let where = {};
    if (req.user)
      where = {
        id: req.params.projectId,
        [Op.or]: {
          published: true,
          userId: req.user.id,
        },
      };
    else where = { published: true, id: req.params.projectId };

    let attributes = {};
    if (!req.user) attributes.exclude = ["presets"];

    let project = await ArProject.findOne({
      where,
      attributes,
      include: [
        {
          model: ArScene,
          as: "scenes",
          separate: true,
          order: [["index", "ASC"]],
          include: [
            {
              model: ArMesh,
              as: "meshes",
            },
            {
              model: ArAsset,
              as: "assets",
              where: {
                hideInViewer: false,
              },
              required: false,
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
        },
      ],
    });

    res.set({
      "Content-Type": "application/json",
    });

    if (project == null) {
      res.status(404);
      res.send({ error: "unable to find project" });
    } else {
      res.status(200);
      res.send(project);
    }
  },
);

router.put(
  baseUrl + "projects/:projectId",
  authMiddleware,
  uploadCover.single("uploadedCover"),
  async (req, res) => {
    let token = req.user;
    let projectId = req.params.projectId;
    let uploadedUrl = req.uploadedUrl;

    try {
      let project = await ArProject.findOne({
        where: { id: projectId },
      });

      if (project == null)
        return res.status(404).send({ error: "project not found" });

      if (project.userId !== token.id && !req.user.admin)
        return res.status(403).send({ error: "user not granted" });

      // Check max favorites limit if transitioning to fav = 1
      if (req.body?.fav !== undefined && parseInt(req.body.fav) === 1 && project.fav !== 1) {
        let settings = { maxFavorites: 10 };
        if (fs.existsSync(homeSettingsPath)) {
          try {
            settings = { ...settings, ...JSON.parse(fs.readFileSync(homeSettingsPath, "utf8")) };
          } catch (e) {
            console.error(e);
          }
        }
        const currentFavoritesCount = await ArProject.count({ where: { fav: 1 } });
        if (currentFavoritesCount >= settings.maxFavorites) {
          return res.status(400).send({ error: "max_favorites_reached", maxFavorites: settings.maxFavorites });
        }
      }

      let updatedUrl = req.body.pictureUrl !== undefined ? req.body.pictureUrl : project.pictureUrl;
      if (uploadedUrl) {
        await deleteFile(project.pictureUrl);
        updatedUrl = uploadedUrl;
      }

      await project.update(
        {
          published: req.body?.published !== undefined ? req.body.published : project.published,
          title: req.body?.title !== undefined ? req.body.title : project.title,
          description: req.body?.description !== undefined ? req.body.description : project.description,
          pictureUrl: updatedUrl,
          userId: project.userId, // keep original owner instead of token.id
          quitMessage: req.body.quitMessage !== undefined ? req.body.quitMessage : project.quitMessage,
          quitUrl: req.body.quitUrl !== undefined ? req.body.quitUrl : project.quitUrl,
          unit: req.body?.unit !== undefined ? req.body.unit : project.unit,
          displayMode: req.body.displayMode !== undefined ? req.body.displayMode : project.displayMode,
          calibrationMessage: req.body?.calibrationMessage !== undefined ? req.body.calibrationMessage : project.calibrationMessage,
          fav:
            req.body?.fav !== undefined ? parseInt(req.body.fav) : project.fav,
        },
        {
          returning: true,
        },
      );

      if (req.body.scenes) {
        let currentIndex = 0;
        for (let scene of JSON.parse(req.body.scenes)) {
          await ArScene.update(
            {
              index: currentIndex,
            },
            {
              where: { id: scene.id },
            },
          );
          currentIndex++;
        }
      }

      return res.status(200).send(project);
    } catch (e) {
      console.log(e);
      res.set({
        "Content-Type": "application/json",
      });
      res.status(400);
      return res.send({ error: "unable to save project" });
    }
  },
);

router.post(baseUrl + "project", authMiddleware, async (req, res) => {
  const token = req.user;
  try {
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
      "Content-Type": "application/json",
    });
    res.status(200);
    return res.send(newProject);
  } catch (e) {
    console.log(e);
    res.status(400);
    return res.send({ error: "unable to create project" });
  }
});

router.post(
  baseUrl + "project/:projectId/image",
  authMiddleware,
  uploadCover.single("image"),
  async (req, res) => {
    try {
      const fullUrl =
        req.protocol +
        "://" +
        req.get("host") +
        "/" +
        req.uploadedUrl.replace(/\\/g, "/");
      return res.status(200).send({ url: fullUrl });
    } catch (e) {
      return res.status(400).send({ error: "upload failed" });
    }
  },
);

router.delete(
  baseUrl + "project/:projectId",
  authMiddleware,
  async (req, res) => {
    const token = req.user;
    const projectId = req.params.projectId;
    try {
      let project = await ArProject.findOne({
        include: [
          {
            model: ArUser,
            as: "owner",
            attributes: ["id"],
          },
        ],
        where: { id: projectId },
      });

      res.set({
        "Content-Type": "application/json",
      });

      if (project == null) {
        return res.status(404).send({ error: "project not found" });
      }

      if (project.owner.id != token.id && !req.user.admin)
        return res.status(403).send({ error: "user not granted" });

      await project.destroy();

      await deleteFolder(getProjectDirectory(projectId));

      res.status(200);
      return res.send();
    } catch (e) {
      console.log(e);
      res.status(400);
      return res.send({ error: "unable to delete project" });
    }
  },
);

router.post(
  baseUrl + "project/:projectId/copy",
  authMiddleware,
  async (req, res) => {
    const token = req.user;
    const projectId = req.params.projectId;

    try {
      const project = await ArProject.findOne({
        where: { id: projectId },
        include: [
          {
            model: ArScene,
            as: "scenes",
            include: [
              {
                model: ArMesh,
                as: "meshes",
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
          {
            model: ArUser,
            as: "owner",
            attributes: ["id"],
          },
        ],
      });

      res.set({
        "Content-Type": "application/json",
      });

      if (!project) {
        return res.status(404).json({ error: "project not found" });
      }

      if (project.owner.id != token.id && !req.user.admin) {
        return res.status(403).send({ error: "user not granted" });
      }

      await sequelize.transaction(async (t) => {
        // copy project
        const newProject = await ArProject.create(
          {
            ...project.get({ plain: true }),
            id: undefined,
            title: req.body.newTitle,
            published: false,
          },
          {
            transaction: t,
          },
        );

        // copy all scenes related to project
        const oldSceneIdToNew = {};
        const oldAssetIdToNew = {};
        const oldLabelIdToNew = {};

        const newScenes = await Promise.all(
          project.scenes.map(async (scene) => {
            const newScene = await ArScene.create(
              {
                ...scene.get({ plain: true }),
                id: undefined, // new id
                projectId: newProject.id, // link to project
              },
              {
                transaction: t,
              },
            );

            oldSceneIdToNew[scene.id] = newScene.id;

            await Promise.all(
              scene.meshes.map(async (mesh) => {
                return ArMesh.create(
                  {
                    ...mesh.get({ plain: true }),
                    id:
                      "project-" +
                      newProject.id +
                      "-scene-" +
                      newScene.title +
                      "-mesh-" +
                      mesh.name, // new id
                    sceneId: newScene.id, // link to scene
                  },
                  {
                    transaction: t,
                  },
                );
              }),
            );

            await Promise.all(
              scene.assets.map(async (asset) => {
                const newAsset = await ArAsset.create(
                  {
                    ...asset.get({ plain: true }),
                    id: undefined, // new id
                    sceneId: newScene.id, // link to scene
                    url: getUpdatedPath(asset.url, projectId, newProject.id),
                  },
                  {
                    transaction: t,
                  },
                );
                oldAssetIdToNew[asset.id] = newAsset.id;
                return newAsset;
              }),
            );

            // copy labels
            const hostUrl = req.protocol + "://" + req.get("host");
            await Promise.all(
              scene.labels.map(async (label) => {
                const labelData = label.get({ plain: true });
                if (labelData.text) {
                  // update urls and add host
                  labelData.text = updateUrl(
                    labelData.text,
                    newProject.id,
                    hostUrl,
                  );
                }
                const newLabel = await ArLabel.create(
                  {
                    ...labelData,
                    id: undefined, // new id
                    sceneId: newScene.id, // link to scene
                  },
                  {
                    transaction: t,
                  },
                );
                oldLabelIdToNew[label.id] = newLabel.id;
                return newLabel;
              }),
            );

            return newScene;
          }),
        );

        await duplicateFolder(
          getProjectDirectory(projectId),
          getProjectDirectory(newProject.id),
        );
        if (newProject.pictureUrl != null) {
          newProject.pictureUrl = getUpdatedPath(
            newProject.pictureUrl,
            projectId,
            newProject.id,
          );
          await newProject.save({ transaction: t });
        }

        // update preset actions with new ids
        if (project.presets) {
          let newPresets = JSON.parse(JSON.stringify(project.presets));
          for (let preset of newPresets) {
            if (preset.text) {
              preset.text = updateUrl(preset.text, newProject.id, hostUrl);
            }
            if (preset.actions) {
              for (let action of preset.actions) {
                if (action.args && action.args[0]) {
                  if (
                    action.args[0].sceneId &&
                    oldSceneIdToNew[action.args[0].sceneId]
                  ) {
                    action.args[0].sceneId =
                      oldSceneIdToNew[action.args[0].sceneId];
                  }
                  if (
                    action.args[0].assetId &&
                    oldAssetIdToNew[action.args[0].assetId]
                  ) {
                    action.args[0].assetId =
                      oldAssetIdToNew[action.args[0].assetId];
                  }
                  if (
                    action.args[0].labelId &&
                    oldLabelIdToNew[action.args[0].labelId]
                  ) {
                    action.args[0].labelId =
                      oldLabelIdToNew[action.args[0].labelId];
                  }
                }
              }
            }
          }
          newProject.presets = newPresets;
          await newProject.save({ transaction: t });
        }

        res.status(200).send(newProject);
      });
    } catch (error) {
      console.log(error);
      res.status(400).json({ error: "unable to duplicate project" });
    }
  },
);

// admin routes

const PROJECTS_PAGE_LENGTH = 10;

router.get(baseUrl + "admin/projects/:page?", async (req, res) => {
  const page = parseInt(req.params.page) || 1;
  try {
    const where = {};

    if (req.query?.title)
      where.title = {
        [Op.like]: `%${req.query?.title}%`,
      };

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
        "fav",
      ],
      include: [
        {
          model: ArScene,
          as: "scenes",
          separate: true,
        },
        {
          model: ArUser,
          as: "owner",
          attributes: ["username"],
        },
      ],
      where,
      group: ["ArProject.id"],
      limit: PROJECTS_PAGE_LENGTH,
      offset: (page - 1) * PROJECTS_PAGE_LENGTH,
      order: [["updatedAt", "DESC"]],
    });

    const count = await ArProject.count({
      where,
    });

    res.set({
      "Content-Type": "application/json",
    });

    if (rows == null) {
      res.status(404);
      return res.send({ error: "no project found" });
    } else {
      res.status(200);
      return res.send({
        projects: rows,
        totalPages: Math.ceil(count / PROJECTS_PAGE_LENGTH),
        currentPage: page,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(400);
    return res.send({ error: "unable to fetch projects" });
  }
});

router.get(
  baseUrl + "project/:projectId/export",
  authMiddleware,
  async (req, res) => {
    const token = req.user;
    const projectId = req.params.projectId;

    if (!token.admin) {
      res.status(401);
      return res.send({ error: "unauthorized", details: "user not granted" });
    }

    res.setHeader("Keep-Alive", "timeout=300");

    try {
      const project = await ArProject.findOne({
        where: { id: projectId },
        include: [
          {
            model: ArScene,
            as: "scenes",
            separate: true,
            order: [["index", "ASC"]],
            include: [
              {
                model: ArMesh,
                as: "meshes",
              },
              {
                model: ArAsset,
                as: "assets",
                required: false,
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
          },
        ],
      });

      if (project) {
        const jsonFilePath = path.join(
          getTempDirectory(),
          projectId + "-" + Date.now() + ".json",
        );

        await fs.promises.mkdir(getTempDirectory(), { recursive: true });

        const projectObj = project.toJSON();

        await fs.promises.writeFile(
          path.join(DIRNAME, jsonFilePath),
          JSON.stringify(projectObj),
        );

        res.zip({
          files: [
            {
              path: path.join(DIRNAME, jsonFilePath),
              name: "project.json",
            },

            {
              path: getProjectDirectory(projectId),
              name: "files",
            },
          ],
          filename: `project-${projectId}.zip`,
        });
      } else return res.status(404).send({ error: "project not found" });
    } catch (e) {
      console.log(e);
      res.status(400);
      return res.send({ error: "unable to fetch project" });
    }
  },
);

router.post(
  baseUrl + "project/import",
  authMiddleware,
  uploadProject.single("zip"),
  async (req, res) => {
    const token = req.user;

    if (!token.admin) {
      res.status(401);
      return res.send({ error: "unauthorized", details: "user not granted" });
    }

    console.log(req.uploadedFilePath);

    try {
      const dataFolder = req.uploadedFilePath + "-data";
      // unzip file
      await decompress(req.uploadedFilePath, dataFolder);

      // create records
      const projectFilePath = path.join(dataFolder, "project.json");
      const data = await fs.promises.readFile(projectFilePath, "utf8");

      const projectObj = JSON.parse(data);
      projectObj.userId = token.id;

      // generate new uuids to prevent conflicts on import
      // while keeping assetid link
      const crypto = await import("crypto");
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

      const hostUrl = req.protocol + "://" + req.get("host");
      if (projectObj.presets) {
        for (let preset of projectObj.presets) {
          if (preset.text) {
            preset.text = updateUrl(preset.text, projectObj.id, hostUrl);
          }
          if (preset.actions) {
            for (let action of preset.actions) {
              if (action.args && action.args[0]) {
                if (
                  action.args[0].sceneId &&
                  oldSceneIdToNew[action.args[0].sceneId]
                ) {
                  action.args[0].sceneId =
                    oldSceneIdToNew[action.args[0].sceneId];
                }
                if (
                  action.args[0].assetId &&
                  oldAssetIdToNew[action.args[0].assetId]
                ) {
                  action.args[0].assetId =
                    oldAssetIdToNew[action.args[0].assetId];
                }
                if (
                  action.args[0].labelId &&
                  oldLabelIdToNew[action.args[0].labelId]
                ) {
                  action.args[0].labelId =
                    oldLabelIdToNew[action.args[0].labelId];
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
            include: [
              {
                model: ArMesh,
                as: "meshes",
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
        ],
      });

      // update file urls

      project.pictureUrl = updateUrl(project.pictureUrl, project.id, hostUrl);
      await project.save();

      for (let scene of project.scenes) {
        scene.envmapUrl = updateUrl(scene.envmapUrl, project.id, hostUrl);

        for (let asset of scene.assets) {
          asset.url = updateUrl(asset.url, project.id, hostUrl);
          await asset.save();
        }

        for (let label of scene.labels) {
          label.text = updateUrl(label.text, project.id, hostUrl);
          await label.save();
        }

        await scene.save();
      }

      const projectDir = getProjectDirectory(project.id);

      await fs.promises.rename(dataFolder + "/files", projectDir);

      // delete temp files
      await fs.promises.rm(dataFolder, { recursive: true, force: true });
      await fs.promises.rm(req.uploadedFilePath, { force: true });

      return res.status(200).send(project);
    } catch (e) {
      console.log(e);
      res.status(400);
      return res.send({ error: "unable to fetch project" });
    }
  },
);

// home settings endpoints

// clean up unused home banner images
function cleanupHomeImages(activeUrl, uploadingFilename = null) {
  try {
    const commonDir = path.join(DIRNAME, "public", "files", "common");
    if (!fs.existsSync(commonDir)) return;
    const files = fs.readdirSync(commonDir);
    const activeFilename = activeUrl ? path.basename(activeUrl) : null;
    
    for (const file of files) {
      // do not delete if it is the active image or the one currently being uploaded
      if (file.startsWith("home_banner_") && file !== activeFilename && file !== uploadingFilename) {
        fs.unlinkSync(path.join(commonDir, file));
        console.log("deleted unused home banner: " + file);
      }
    }
  } catch (e) {
    console.log("error cleaning up home images: " + e.message);
  }
}

router.get(baseUrl + "home-settings", async (req, res) => {
  try {
    let settings = {
      title: "Vos projets",
      text: "Découvrez nos projets interactifs en réalité augmentée.",
      imageUrl: "",
      maxFavorites: 10,
    };
    if (fs.existsSync(homeSettingsPath)) {
      const data = fs.readFileSync(homeSettingsPath, "utf8");
      settings = { ...settings, ...JSON.parse(data) };
    }
    res.status(200).json(settings);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "failed to read home settings" });
  }
});

router.put(baseUrl + "home-settings", authMiddleware, async (req, res) => {
  try {
    const title = req.body.title || "Vos projets";
    const text = req.body.text || "";
    const maxFavorites = parseInt(req.body.maxFavorites) !== undefined ? parseInt(req.body.maxFavorites) : 10;

    if (title.length > 100) {
      return res.status(400).json({ error: "title_too_long" });
    }
    if (text.length > 1500) {
      return res.status(400).json({ error: "description_too_long" });
    }
    if (isNaN(maxFavorites) || maxFavorites < 1) {
      return res.status(400).json({ error: "invalid_max_favorites" });
    }

    const settings = {
      title: title,
      text: text,
      imageUrl: req.body.imageUrl || "",
      maxFavorites: maxFavorites,
    };
    fs.mkdirSync(path.dirname(homeSettingsPath), { recursive: true });
    fs.writeFileSync(
      homeSettingsPath,
      JSON.stringify(settings, null, 2),
      "utf8",
    );
    cleanupHomeImages(settings.imageUrl);
    res.status(200).json(settings);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "failed to save home settings" });
  }
});

// configure multer for image upload
const homeImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(DIRNAME, "public", "files", "common");
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = "home_banner_" + Date.now() + ext;
    cb(null, filename);
  },
});

const uploadHomeImage = multer({
  storage: homeImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post(
  baseUrl + "home-settings/image",
  authMiddleware,
  uploadHomeImage.single("image"),
  async (req, res) => {
    try {
      let activeUrl = "";
      if (fs.existsSync(homeSettingsPath)) {
        try {
          const data = fs.readFileSync(homeSettingsPath, "utf8");
          activeUrl = JSON.parse(data).imageUrl || "";
        } catch (e) {
          console.log("error reading settings during upload: " + e.message);
        }
      }
      // pass the new filename to protect it from deletion
      cleanupHomeImages(activeUrl, req.file.filename);

      const relativePath = path.join(
        "public",
        "files",
        "common",
        req.file.filename,
      );
      const fullUrl =
        req.protocol +
        "://" +
        req.get("host") +
        "/" +
        relativePath.replace(/\\/g, "/");
      res.status(200).json({ url: fullUrl });
    } catch (e) {
      console.log(e);
      res.status(400).json({ error: "failed to upload image" });
    }
  },
);

export default router;
