import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import {computeGeometryMetricsFromFile} from "../../socket/utils/assetMetrics.js";
import {
    normalizePath,
    fileExists,
    toInputRel,
    makeVariantRel,
    buildVariantSet,
} from "./variantSet.js";

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

function ensureParentDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function withDefaultMetricShape(metrics = {}) {
    return {
        assetSizeBytes: metrics.assetSizeBytes ?? null,
        triangleCount: metrics.triangleCount ?? null,
        vertexCount: metrics.vertexCount ?? null,
        meshCount: metrics.meshCount ?? null,
    };
}

async function runTextureCompress({
                                      gltfTransformCmd,
                                      apiRoot,
                                      inputDisk,
                                      outputDisk,
                                      format = "webp"
                                  }) {
    ensureParentDir(outputDisk);

    const args = [
        format,
        inputDisk,
        outputDisk,
    ];

    console.log(`[TextureCompress] Running: ${gltfTransformCmd} ${args.join(" ")}`);
    
    await run(gltfTransformCmd, args, apiRoot);

    if (!fileExists(outputDisk)) {
        throw new Error(`texture compression did not produce output file: ${outputDisk}`);
    }
}

export async function compressTexturesAsset({ asset, params = {}, apiRoot }) {
    try {
        if (!asset?.url) {
            throw new Error("Asset url missing");
        }

        const inputRel = toInputRel(asset.url);
        const inputDisk = path.resolve(apiRoot, inputRel);

        if (!fileExists(inputDisk)) {
            throw new Error(`Original file not found on disk: ${inputDisk}`);
        }

        const gltfTransformCmd =
            process.platform === "win32"
                ? path.join(apiRoot, "node_modules", ".bin", "gltf-transform.cmd")
                : path.join(apiRoot, "node_modules", ".bin", "gltf-transform");

        if (!fileExists(gltfTransformCmd)) {
            throw new Error(`gltf-transform not found: ${gltfTransformCmd}`);
        }

        const format = params.format ?? "webp";
        const variantName = format;

        const outputRel = makeVariantRel(inputRel, variantName);
        const outputDisk = path.resolve(apiRoot, outputRel);

        const beforeMetrics = withDefaultMetricShape(
            await computeGeometryMetricsFromFile(inputDisk)
        );

        await runTextureCompress({
            gltfTransformCmd,
            apiRoot,
            inputDisk,
            outputDisk,
            format
        });

        const afterMetrics = withDefaultMetricShape(
            await computeGeometryMetricsFromFile(outputDisk)
        );

        // Safe JSON parsing/handling for lodMeta
        let lodMeta = asset.lodMeta;
        if (typeof lodMeta === "string") {
            try { lodMeta = JSON.parse(lodMeta); } catch (e) { lodMeta = {}; }
        }
        if (!lodMeta || typeof lodMeta !== 'object') lodMeta = {};
        
        if (!lodMeta.variants) lodMeta.variants = {};
        
        lodMeta.variants[variantName] = {
            path: normalizePath(outputRel),
            format: format,
            generatedAt: new Date().toISOString(),
            ...afterMetrics,
            status: "ready"
        };

        // Important: Re-stringifying if the model expects a string, 
        // or just assigning if it's a JSON field. Sequelize usually handles objects for JSON types.
        asset.lodMeta = lodMeta;
        await asset.save();

        const variants = buildVariantSet(asset, apiRoot);

        return {
            asset: {
                id: asset.id,
                url: asset.url,
                lodMeta: asset.lodMeta
            },
            strategyResult: {
                strategy: "compressTextures",
                ok: true,
                format,
                outputPath: normalizePath(outputRel),
            },
            metrics: {
                before: beforeMetrics,
                after: afterMetrics,
            },
            variants
        };
    } catch (e) {
        console.error("[compressTexturesAsset] CRITICAL ERROR:", e);
        throw e;
    }
}