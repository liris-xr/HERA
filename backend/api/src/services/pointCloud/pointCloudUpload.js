import { importPotreeArchive, isPotreeArchivePath } from "./potreeDataset.js";
import { convertPlyPointCloudToPotree } from "./potreeConverter.js";
import { isStaticPointCloudPath } from "./staticPointCloud.js";
import { isSplatAssetPath, prepareUploadedSplatAsset } from "../splat/sparkRadAsset.js";

function normalizeKind(value) {
    const kind = String(value ?? "").trim().toLowerCase();
    return kind && kind !== "auto" ? kind : null;
}

function logUploadTreatment(message, details = {}) {
    console.info("[HERA][PointCloudUpload]", message, details);
}

function logStreamingMetadataGenerated(result, details = {}) {
    logUploadTreatment("streaming metadata generated", {
        ...details,
        url: result?.url ?? null,
        format: result?.lodMeta?.pointCloud?.format ?? null,
        pointCount: result?.lodMeta?.pointCloud?.pointCount ?? null,
    });
}

export async function prepareUploadedPointCloudAsset({fileRelPath, assetName = null, apiRoot = process.cwd(), requestedKind = null,}) {
    if (!fileRelPath) return null;

    console.info("[HERA][DEBUG] pointCloudUpload.js reached", {fileRelPath, assetName, requestedKind,});

    //if used uploads .zip with a potree dataset, we extract it and look for metadata.json & cloud.js
    if (isPotreeArchivePath(fileRelPath)) {
        logUploadTreatment("potree archive detected", {fileRelPath, assetName, requestedKind, treatment: "extract archive and store metadata.json/cloud.js as pointcloud-streaming",
        });

        const importedArchive = await importPotreeArchive({archiveRelPath: fileRelPath, assetName, apiRoot,});
        logStreamingMetadataGenerated(importedArchive, {
            fileRelPath,
            assetName,
            requestedKind,
            source: "potree-archive",
        });
        return importedArchive;
    }

    const kind = normalizeKind(requestedKind);
    //if it's a .ply
    if (isStaticPointCloudPath(fileRelPath)) {
        //check if it's a splat
        if (kind === "splat") {
            logUploadTreatment("ply kept as splat", {fileRelPath, assetName, requestedKind, treatment: "optional Spark RAD preprocessing",});
            return await prepareUploadedSplatAsset({
                fileRelPath,
                assetName,
                apiRoot,
                requestedKind,
            });
        }

        logUploadTreatment("ply point cloud candidate detected", {
            fileRelPath,
            assetName,
            requestedKind,
            treatment: "inspect header and convert classic PLY to Potree streaming",
        });

        const convertedPointCloud = await convertPlyPointCloudToPotree({
            fileRelPath,
            assetName,
            apiRoot,
            strict: kind === "pointcloud",
        });
        if (convertedPointCloud) {
            logStreamingMetadataGenerated(convertedPointCloud, {
                fileRelPath,
                assetName,
                requestedKind,
                source: "ply-conversion",
            });
            return convertedPointCloud;
        }

        logUploadTreatment("ply gaussian splat candidate detected", {
            fileRelPath,
            assetName,
            requestedKind,
            treatment: "optional Spark RAD preprocessing",
        });
        return await prepareUploadedSplatAsset({
            fileRelPath,
            assetName,
            apiRoot,
            requestedKind: "splat",
        });
    }

    if (kind === "splat" || isSplatAssetPath(fileRelPath)) {
        logUploadTreatment("splat candidate detected", {
            fileRelPath,
            assetName,
            requestedKind,
            treatment: "optional Spark RAD preprocessing",
        });
        return await prepareUploadedSplatAsset({
            fileRelPath,
            assetName,
            apiRoot,
            requestedKind,
        });
    }

    if (!kind) return null;

    if (kind === "pointcloud") {
        const error = new Error(
            "Potree conversion skipped: input was not recognized as a classic .ply point cloud. " +
            "Classic point cloud upload supports .ply files, which are converted to Potree streaming on save."
        );
        error.code = "POINT_CLOUD_INPUT_NOT_RECOGNIZED";
        error.diagnostics = {
            reason: "input-not-recognized",
            fileRelPath,
            requestedKind,
        };
        throw error;
    }

    if (kind === "pointcloud-streaming") {
        throw new Error("Streaming point cloud upload requires a converted Potree .zip dataset.");
    }

    return null;
}
