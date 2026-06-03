import { importPotreeArchive, isPotreeArchivePath } from "./potreeDataset.js";
import { convertPlyPointCloudToPotree } from "./potreeConverter.js";
import { isStaticPointCloudPath } from "./staticPointCloud.js";

function normalizeKind(value) {
    const kind = String(value ?? "").trim().toLowerCase();
    return kind && kind !== "auto" ? kind : null;
}

function logUploadTreatment(message, details = {}) {
    console.info("[HERA][PointCloudUpload]", message, details);
}
export async function prepareUploadedPointCloudAsset({fileRelPath, assetName = null, apiRoot = process.cwd(), requestedKind = null,}) {
    if (!fileRelPath) return null;

    console.info("[HERA][DEBUG] pointCloudUpload.js reached", {fileRelPath, assetName, requestedKind,});

    //if used uploads .zip with a potree dataset, we extract it and look for metadata.json & cloud.js
    if (isPotreeArchivePath(fileRelPath)) {
        logUploadTreatment("potree archive detected", {fileRelPath, assetName, requestedKind, treatment: "extract archive and store metadata.json/cloud.js as pointcloud-streaming",
        });

        return await importPotreeArchive({archiveRelPath: fileRelPath, assetName, apiRoot,});
    }

    const kind = normalizeKind(requestedKind);
    //if it's a .ply
    if (isStaticPointCloudPath(fileRelPath)) {
        //check if it's a splat
        if (kind === "splat") {
            logUploadTreatment("ply kept as splat", {fileRelPath, assetName, requestedKind, treatment: "leave file in Gaussian splat pipeline",});
            return null;
        }

        logUploadTreatment("ply point cloud candidate detected", {
            fileRelPath,
            assetName,
            requestedKind,
            treatment: "inspect header and convert classic PLY to Potree streaming",
        });

        return await convertPlyPointCloudToPotree({
            fileRelPath,
            assetName,
            apiRoot,
            strict: kind === "pointcloud",
        });
    }

    if (!kind) return null;

    if (kind === "pointcloud") {
        throw new Error("Classic point cloud upload supports .ply files, which are converted to Potree streaming on save.");
    }

    if (kind === "pointcloud-streaming") {
        throw new Error("Streaming point cloud upload requires a converted Potree .zip dataset.");
    }

    return null;
}
