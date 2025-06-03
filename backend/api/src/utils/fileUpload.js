import multer from "multer";
import {DIRNAME} from "../../app.js";
import * as path from "node:path";
import * as fs from "node:fs";
import arAsset from "../orm/models/arAsset.js";
import arSound from "../orm/models/arSound.js";
import {Op} from "sequelize";
import {ArMesh, ArProject, ArScene} from "../orm/index.js";



export const uploadCover = multer({ storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const projectId = req.body.id;
            if(!projectId) throw new Error('Project Id is missing');

            const uploadDirectory = path.join(DIRNAME, getImagesDirectory(projectId))
            if (!fs.existsSync(uploadDirectory)) {
                fs.mkdirSync(uploadDirectory, { recursive: true });
            }

            cb(null, uploadDirectory);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);

            const filename = "cover" + Date.now() + ext
            req.uploadedUrl = path.join(getImagesDirectory(req.body.id), filename);

            cb(null, filename);
        }
})});




export const uploadEnvmapAndAssets = multer({ storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const projectId = req.projectId;
            if(!projectId) throw new Error('Project Id is missing');

            if(file.fieldname === 'uploadedEnvmap') {
                const uploadDirectory = path.join(DIRNAME, getEnvmapsDirectory(projectId))
                if (!fs.existsSync(uploadDirectory)) {
                    fs.mkdirSync(uploadDirectory, { recursive: true });
                }

                cb(null, uploadDirectory);
            } else if (file.fieldname === "uploads") {
                const uploadDirectory = path.join(DIRNAME, getAssetsDirectory(projectId))
                if (!fs.existsSync(uploadDirectory)) {
                    fs.mkdirSync(uploadDirectory, {recursive: true});
                }

                cb(null, uploadDirectory);
            } else if (file.fieldname === "soundToUploads") {
                const uploadDirectory = path.join(DIRNAME, getSoundsDirectory(projectId))
                console.log("uploadDirectory 58");
                console.log(uploadDirectory);
                if (!fs.existsSync(uploadDirectory)) {
                    console.log("create folder")
                    fs.mkdirSync(uploadDirectory, { recursive: true });
                }

                cb(null, uploadDirectory);
            }
            else cb(null, "")
        },
        filename: (req, file, cb) => {
            const projectId = req.projectId;
            const ext = path.extname(file.originalname);
            if(file.fieldname === 'uploadedEnvmap') {
                const filename = "envmap" + Date.now() + ext
                req.uploadedUrl = path.join(getEnvmapsDirectory(projectId), filename);

                cb(null, filename);
            } else if (file.fieldname === "uploads") {
                if (!req.currentAssetCount) {
                    req.currentAssetCount = 0
                }
                const filename = "asset" + Date.now() + req.currentAssetCount + ext
                req.currentAssetCount++;

                if (!req.uploadedFilenames)
                    req.uploadedFilenames = [];
                req.uploadedFilenames.push(path.join(getAssetsDirectory(req.projectId), filename));

                cb(null, filename);
            } else if (file.fieldname === "soundToUploads") {
                if (!req.currentSoundCount) {
                    req.currentSoundCount = 0
                }
                const filename = "sound" + Date.now() + req.currentSoundCount + ext
                req.currentSoundCount++;

                if (!req.uploadedFilenames)
                    req.uploadedFilenames = [];
                req.uploadedFilenames.push(path.join(getSoundsDirectory(req.projectId), filename));

                cb(null, filename);
            }

            else cb(null, "")
        }
    })})





export const uploadAsset = multer({ storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const projectId = req.projectId;
            if(!projectId) throw new Error('Project Id is missing');

            const uploadDirectory = path.join(DIRNAME, getAssetsDirectory(projectId))
            if (!fs.existsSync(uploadDirectory)) {
                fs.mkdirSync(uploadDirectory, { recursive: true });
            }

            cb(null, uploadDirectory);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);

            if(!req.currentAssetCount){
                req.currentAssetCount = 0
            }
            const filename = "asset" + Date.now() + req.currentAssetCount + ext
            req.currentAssetCount++;

            if(!req.uploadedFilenames)
                req.uploadedFilenames = [];
            req.uploadedFilenames.push(path.join(getAssetsDirectory(req.projectId), filename));

            cb(null, filename);
        }
    })});


export const adminUploadAsset = multer({ storage: multer.diskStorage({
        destination: async (req, file, cb) => {
            const sceneId = req.body.sceneId

            let scene = await ArScene.findOne({
                include: [
                    {
                        model: ArProject,
                        as: "project",
                        attributes: ["id"],
                    }
                ],
                where: {id: sceneId},
            })

            const projectId = scene.project.id;
            req.projectId = projectId;
            if(!projectId) throw new Error('Project Id is missing');

            const uploadDirectory = path.join(DIRNAME, getAssetsDirectory(projectId))
            if (!fs.existsSync(uploadDirectory)) {
                fs.mkdirSync(uploadDirectory, { recursive: true });
            }

            cb(null, uploadDirectory);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);

            if(!req.currentAssetCount){
                req.currentAssetCount = 0
            }
            const filename = "asset" + Date.now() + req.currentAssetCount + ext
            req.currentAssetCount++;

            if(!req.uploadedFilenames)
                req.uploadedFilenames = [];
            req.uploadedFilenames.push(path.join(getAssetsDirectory(req.projectId), filename));

            cb(null, filename);
        }
})});

export const uploadSound = multer({ storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const projectId = req.projectId;
            if(!projectId) throw new Error('Project Id is missing');
            console.log("uploadSound fileUpload");
            const uploadDirectory = path.join(DIRNAME, getSoundsDirectory(projectId))
            console.log(uploadDirectory);
            if (!fs.existsSync(uploadDirectory)) {
                fs.mkdirSync(uploadDirectory, { recursive: true });
            }

            cb(null, uploadDirectory);
        },
        filename: (req, file, cb) => {
            console.log("uploadSound")
            const ext = path.extname(file.originalname);
            console.log("uploadSound")
            if(!req.currentSoundCount){
                req.currentSoundCount = 0
            }
            console.log("ok")
            const filename = "sound" + Date.now() + req.currentSoundCount + ext
            req.currentSoundCount++;

            console.log("req.uploadedFilenames: ", req.uploadedFilenames)

            if(!req.uploadedFilenames)
                req.uploadedFilenames = [];
            req.uploadedFilenames.push(path.join(getSoundsDirectory(req.projectId), filename));

            cb(null, filename);
        }
    })});

export const adminUploadSound = multer({ storage: multer.diskStorage({
        destination: async (req, file, cb) => {
            const sceneId = req.body.sceneId

            let scene = await ArScene.findOne({
                include: [
                    {
                        model: ArProject,
                        as: "project",
                        attributes: ["id"],
                    }
                ],
                where: {id: sceneId},
            })

            const projectId = scene.project.id;
            req.projectId = projectId;
            if(!projectId) throw new Error('Project Id is missing');

            const uploadDirectory = path.join(DIRNAME, getSoundsDirectory(projectId))
            if (!fs.existsSync(uploadDirectory)) {
                fs.mkdirSync(uploadDirectory, { recursive: true });
            }

            cb(null, uploadDirectory);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);

            if(!req.currentSoundCount){
                req.currentSoundCount = 0
            }
            const filename = "sound" + Date.now() + req.currentSoundCount + ext
            req.currentSoundCount++;

            if(!req.uploadedFilenames)
                req.uploadedFilenames = [];
            req.uploadedFilenames.push(path.join(getAssetsDirectory(req.projectId), filename));

            cb(null, filename);
        }
    })});

export const uploadProject = multer({ storage: multer.diskStorage({
        destination: (req, file, cb) => {

            const uploadDirectory = path.join(DIRNAME, 'public', 'files', 'temp')
            if (!fs.existsSync(uploadDirectory)) {
                fs.mkdirSync(uploadDirectory, { recursive: true })
            }

            cb(null, uploadDirectory)
        },

        filename: (req, file, cb) => {

            const filename = Date.now() + "-" + file.originalname

            req.uploadedFilePath = path.join(DIRNAME, 'public', 'files', 'temp',  filename)

            cb(null, filename)
        }
    })})


export function getTempDirectory() {
    return path.join('public', 'files', 'temp')
}

export function getProjectDirectory(projectId){
    return path.join('public','files',projectId);
}

function getImagesDirectory(projectId){
    return path.join(getProjectDirectory(projectId),'images');
}

function getAssetsDirectory(projectId){
    return path.join(getProjectDirectory(projectId),'assets');
}

function getSoundsDirectory(projectId){
    return path.join(getProjectDirectory(projectId),'sounds');
}

function getEnvmapsDirectory(projectId){
    return path.join(getProjectDirectory(projectId),'envmaps');
}


function isUploadedFilePath(pathFromServerRoot){
    const splitPath = pathFromServerRoot.split(path.sep);
    return !(splitPath[1] !== "files" || splitPath.length < 2);

}

export function deleteFile(pathFromServerRoot){
    if(!isUploadedFilePath(pathFromServerRoot)){
        console.error("This file cannot be deleted");
        return;
    }
    const filePath = path.join(DIRNAME, pathFromServerRoot);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }else{
        console.error("unable to delete file");
    }
}


export async function deleteFolder(pathFromServerRoot) {
    if (!isUploadedFilePath(pathFromServerRoot)) {
        console.error("This folder cannot be deleted");
        return;
    }
    const folderPath = path.join(DIRNAME, pathFromServerRoot);
    try {
        await fs.promises.rm(folderPath, {recursive: true, force: true});
    } catch (err) {
        console.error(`Error while deleting ${folderPath}.`, err);
    }
}


export async function duplicateFolder(source, dest){
    const sourcePath = path.join(DIRNAME, source);
    const destPath = path.join(DIRNAME, dest);
    try{
        await fs.promises.cp(sourcePath, destPath, { recursive: true });
    }catch (e){
        console.error("Unable to duplicate folder : "+e);
    }
}


export function getUpdatedPath(currentPath, oldId, newId){
    return currentPath.replace(oldId, newId);
}


export async function deleteAsset(asset) {


    let assetsUsingSameUrl = await arAsset.findAll({
        where:{
            url:asset.url,
            id:{
                [Op.not]: asset.id
            }
        }
    })

    if (assetsUsingSameUrl.length === 0)
        deleteFile(asset.url);
}

export async function deleteSound(sound) {
    let soundsUsingSameUrl = await arSound.findAll({
        where:{
            url:sound.url,
            id:{
                [Op.not]: sound.id
            }
        }
    })

    if (soundsUsingSameUrl.length === 0)
        deleteFile(sound.url);
}
/*


public/
    abc-123/
        images/
            projectCover.jpg
        assets/
            a.glb
            b.glb
            c.glb
            ...
            //autres assets
    def-456
    ghi-789


 */
