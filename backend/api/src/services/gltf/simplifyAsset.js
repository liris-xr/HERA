import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { computeAssetMetrics, computeGeometryMetricsFromFile } from "../../socket/utils/assetMetrics.js";
import {normalizePath, fileExists, toInputRel, makeVariantRel, buildVariantSet,} from "./variantSet.js";

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

async function runWeld({gltfTransformCmd, apiRoot, inputDisk, outputDisk,}) {
    ensureParentDir(outputDisk);

    const args = ["weld", inputDisk, outputDisk];

    await run(gltfTransformCmd, args, apiRoot);

    if (!fileExists(outputDisk)) {
        throw new Error(`weld did not produce output file: ${outputDisk}`);
    }
}

async function runSimplifyLevel({gltfTransformCmd, apiRoot, inputDisk, outputDisk, ratio, error, lockBorder = false,}) {
    ensureParentDir(outputDisk);

    const args = [
        "simplify",
        inputDisk,
        outputDisk,
        "--ratio", String(ratio),
        "--error", String(error),
        "--lock-border", String(lockBorder),
    ];

    await run(gltfTransformCmd, args, apiRoot);

    if (!fileExists(outputDisk)) {
        throw new Error(`simplify did not produce output file: ${outputDisk}`);
    }
}

export async function simplifyAsset({ asset, params = {}, apiRoot }) {
    let weldedDisk = null;

    if (!asset?.url) {
        throw new Error("Asset url missing");
    }

    const inputRel = toInputRel(asset.url);
    const originalDisk = path.resolve(apiRoot, inputRel);

    if (!fileExists(originalDisk)) {
        throw new Error(`Original file not found on disk: ${originalDisk}`);
    }

    const gltfTransformCmd =
        process.platform === "win32"
            ? path.join(apiRoot, "node_modules", ".bin", "gltf-transform.cmd")
            : path.join(apiRoot, "node_modules", ".bin", "gltf-transform");

    if (!fileExists(gltfTransformCmd)) {
        throw new Error(`gltf-transform not found: ${gltfTransformCmd}`);
    }

    const originalMetrics = withDefaultMetricShape(
        await computeAssetMetrics(asset, apiRoot)
    );

    const presets = params.errorPresets ?? {
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

    safeUnlink(n1Disk);
    safeUnlink(n2Disk);
    safeUnlink(n3Disk);

    const tmpDir = path.join(apiRoot, ".tmp-lod");
    fs.mkdirSync(tmpDir, { recursive: true });
    weldedDisk = path.join(tmpDir, `${asset.id}-${Date.now()}-welded.glb`);

    try {
        await runWeld({
            gltfTransformCmd,
            apiRoot,
            inputDisk: originalDisk,
            outputDisk: weldedDisk,
        });

        await Promise.all([
            runSimplifyLevel({
                gltfTransformCmd,
                apiRoot,
                inputDisk: weldedDisk,
                outputDisk: n1Disk,
                ratio: presets.n1.ratio ?? 0,
                error: presets.n1.error,
                lockBorder: true,
            }),
            runSimplifyLevel({
                gltfTransformCmd,
                apiRoot,
                inputDisk: weldedDisk,
                outputDisk: n2Disk,
                ratio: presets.n2.ratio ?? 0,
                error: presets.n2.error,
                lockBorder: true,
            }),
            runSimplifyLevel({
                gltfTransformCmd,
                apiRoot,
                inputDisk: weldedDisk,
                outputDisk: n3Disk,
                ratio: presets.n3.ratio ?? 0,
                error: presets.n3.error,
                lockBorder: true,
            }),
        ]);

        const [n1MetricsRaw, n2MetricsRaw, n3MetricsRaw] = await Promise.all([
            computeGeometryMetricsFromFile(n1Disk),
            computeGeometryMetricsFromFile(n2Disk),
            computeGeometryMetricsFromFile(n3Disk),
        ]);

        const n1Metrics = withDefaultMetricShape(n1MetricsRaw);
        const n2Metrics = withDefaultMetricShape(n2MetricsRaw);
        const n3Metrics = withDefaultMetricShape(n3MetricsRaw);

        asset.simplifiedUrl = n1Rel;
        asset.preferredVariant = "original";

        asset.lodMeta = {
            generator: "gltf-transform",
            strategy: "simplify",
            mode: "error-only",
            generatedAt: new Date().toISOString(),
            original: originalMetrics,
            variants: {
                n1: {
                    path: normalizePath(n1Rel),
                    requestedError: presets.n1.error,
                    requestedRatio: presets.n1.ratio ?? 0,
                    ...n1Metrics,
                    status: fileExists(n1Disk) ? "ready" : "missing",
                },
                n2: {
                    path: normalizePath(n2Rel),
                    requestedError: presets.n2.error,
                    requestedRatio: presets.n2.ratio ?? 0,
                    ...n2Metrics,
                    status: fileExists(n2Disk) ? "ready" : "missing",
                },
                n3: {
                    path: normalizePath(n3Rel),
                    requestedError: presets.n3.error,
                    requestedRatio: presets.n3.ratio ?? 0,
                    ...n3Metrics,
                    status: fileExists(n3Disk) ? "ready" : "missing",
                },
            },
        };

        await asset.save();

        const metrics = await computeAssetMetrics(asset, apiRoot);
        const variants = buildVariantSet(asset, apiRoot);

        return {
            asset: {
                id: asset.id,
                url: asset.url,
                simplifiedUrl: asset.simplifiedUrl,
                preferredVariant: asset.preferredVariant,
                lodMeta: asset.lodMeta,
            },
            metrics,
            variants,
            lodMeta: asset.lodMeta,
            outputs: {
                n1: { path: normalizePath(n1Rel) },
                n2: { path: normalizePath(n2Rel) },
                n3: { path: normalizePath(n3Rel) },
            },
        };
    } finally {
        if (weldedDisk) {
            safeUnlink(weldedDisk);
        }
    }
}