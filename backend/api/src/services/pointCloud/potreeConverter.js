import "../../config.js";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { inspectPotreeDatasetDirectory } from "./potreeDataset.js";
import { inspectPlyPointCloudFile } from "./staticPointCloud.js";
import { convertPlyToLas } from "./plyToLas.js";

const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const MAX_CAPTURED_LOG_CHARS = 16000;

function normalizeRelPath(value = "") {
    return String(value ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function stripOuterQuotes(value = "") {
    return String(value ?? "").trim().replace(/^["']|["']$/g, "");
}

function localConverterCandidates() {
    const relativeToolPath = path.join(
        ".hera-tools",
        "PotreeConverter_2.1.1_x64_windows",
        "PotreeConverter_windows_x64",
        "PotreeConverter.exe"
    );

    return [
        path.resolve(process.cwd(), relativeToolPath),
        path.resolve(process.cwd(), "..", relativeToolPath),
        path.resolve(process.cwd(), "..", "..", relativeToolPath),
    ];
}

function resolveExecutablePath(value) {
    const candidate = stripOuterQuotes(value);
    if (!candidate) return null;

    const resolved = path.isAbsolute(candidate)
        ? candidate
        : path.resolve(process.cwd(), candidate);

    return fs.existsSync(resolved) ? resolved : null;
}

function getConverterPath() {
    const configured = process.env.POTREE_CONVERTER_PATH ?? process.env.POTREE_CONVERTER ?? "";
    return resolveExecutablePath(configured)
        ?? localConverterCandidates().find((candidate) => fs.existsSync(candidate))
        ?? "";
}

function ensureConverterPath() {
    const converterPath = getConverterPath();
    if (!converterPath) {
        throw buildConverterConfigError();
    }
    return converterPath;
}

function getConverterTimeoutMs() {
    const value = Number(process.env.POTREE_CONVERTER_TIMEOUT_MS);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function parseExtraArgs() {
    const raw = String(process.env.POTREE_CONVERTER_ARGS ?? "").trim();
    if (!raw) return [];

    return (raw.match(/"[^"]+"|'[^']+'|\S+/g) ?? []).map(stripOuterQuotes).filter(Boolean);
}

function appendCapturedLog(current, chunk) {
    const next = current + chunk.toString();
    return next.length > MAX_CAPTURED_LOG_CHARS
        ? next.slice(next.length - MAX_CAPTURED_LOG_CHARS)
        : next;
}

function buildConverterConfigError() {
    const configured = stripOuterQuotes(process.env.POTREE_CONVERTER_PATH ?? process.env.POTREE_CONVERTER ?? "");
    const configuredMessage = configured
        ? ` Configured path was not found: ${configured}.`
        : "";

    return new Error(
        "Classic .ply point clouds must be converted to Potree before streaming. " +
        "Set POTREE_CONVERTER_PATH to the PotreeConverter executable, then retry the upload." +
        configuredMessage
    );
}

function buildConverterFailureError({ code, stdout, stderr, cause = null }) {
    const details = [stderr, stdout].map((value) => String(value ?? "").trim()).filter(Boolean).join("\n");
    const suffix = details ? `\n\nPotreeConverter output:\n${details}` : "";
    const message = cause?.code === "ENOENT"
        ? "PotreeConverter was not found. Check POTREE_CONVERTER_PATH."
        : `PotreeConverter failed${Number.isInteger(code) ? ` with exit code ${code}` : ""}.`;

    const error = new Error(`${message}${suffix}`);
    if (cause) error.cause = cause;
    return error;
}

async function runPotreeConverter({ inputPath, outputDir }) {
    const converterPath = ensureConverterPath();
    const args = [inputPath, "-o", outputDir, ...parseExtraArgs()];
    const timeoutMs = getConverterTimeoutMs();

    return await new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        let settled = false;

        const child = spawn(converterPath, args, {
            windowsHide: true,
            shell: false,
        });

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            child.kill("SIGTERM");
            reject(new Error(`PotreeConverter timed out after ${Math.round(timeoutMs / 1000)}s.`));
        }, timeoutMs);

        child.stdout?.on("data", (chunk) => {
            stdout = appendCapturedLog(stdout, chunk);
        });

        child.stderr?.on("data", (chunk) => {
            stderr = appendCapturedLog(stderr, chunk);
        });

        child.on("error", (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(buildConverterFailureError({ stdout, stderr, cause: error }));
        });

        child.on("close", (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);

            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(buildConverterFailureError({ code, stdout, stderr }));
            }
        });
    });
}

export async function convertPlyPointCloudToPotree({
    fileRelPath,
    assetName = null,
    apiRoot = process.cwd(),
    strict = true,
}) {
    console.info("[HERA][DEBUG] potreeConverter.js reached", {
        fileRelPath,
        assetName,
        strict,
    });

    const inspected = await inspectPlyPointCloudFile({ fileRelPath, apiRoot });
    if (!inspected) return null;

    const { diskPath, header, assetKind, normalizedRel, stat } = inspected;

    if (assetKind !== "pointcloud") {
        if (!strict) return null;

        if (assetKind === "splat") {
            throw new Error("This .ply looks like a Gaussian splat. Upload it as a splat, not as a classic point cloud.");
        }

        throw new Error("Classic point cloud .ply must contain vertex x, y, and z properties.");
    }

    const outputDir = path.join(
        path.dirname(diskPath),
        `${path.basename(diskPath, path.extname(diskPath))}_potree`
    );
    const tempLasPath = path.join(
        path.dirname(diskPath),
        `${path.basename(diskPath, path.extname(diskPath))}_potree_source.las`
    );

    ensureConverterPath();

    await fs.promises.rm(outputDir, { recursive: true, force: true });
    await fs.promises.mkdir(outputDir, { recursive: true });

    try {
        console.info("[HERA][PotreeConverter] ply-to-las start", {
            fileRelPath: normalizedRel,
            assetName,
            sourceEncoding: header.format,
            sourcePointCount: header.pointCount,
            tempLasPath,
        });

        const lasInfo = await convertPlyToLas({
            inputPath: diskPath,
            outputPath: tempLasPath,
        });

        console.info("[HERA][PotreeConverter] start", {
            fileRelPath: normalizedRel,
            assetName,
            converterInput: tempLasPath,
            sourceEncoding: header.format,
            sourcePointCount: lasInfo.pointCount,
            outputDir,
        });

        await runPotreeConverter({ inputPath: tempLasPath, outputDir });
        const result = await inspectPotreeDatasetDirectory(outputDir, apiRoot, assetName);

        await fs.promises.rm(diskPath, { force: true });
        await fs.promises.rm(tempLasPath, { force: true });

        console.info("[HERA][PotreeConverter] done", {
            fileRelPath: normalizedRel,
            url: result.url,
            format: result.lodMeta?.pointCloud?.format ?? null,
            pointCount: result.lodMeta?.pointCloud?.pointCount ?? lasInfo.pointCount ?? null,
        });

        return {
            ...result,
            importedPly: normalizeRelPath(normalizedRel),
            lodMeta: {
                ...result.lodMeta,
                pointCloud: {
                    ...result.lodMeta.pointCloud,
                    sourceFormat: "ply",
                    sourceEncoding: header.format,
                    sourcePointCount: header.pointCount,
                    sourceFileSizeBytes: stat.size,
                    sourceProperties: header.vertexProperties,
                    convertedAt: new Date().toISOString(),
                },
            },
        };
    } catch (error) {
        await fs.promises.rm(outputDir, { recursive: true, force: true });
        await fs.promises.rm(tempLasPath, { force: true });
        throw error;
    }
}
