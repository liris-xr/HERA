import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const SPLAT_INPUT_EXTENSIONS = new Set([".splat", ".spz", ".ksplat", ".ply", ".sog", ".rad"]);
const DEFAULT_BUILD_ARGS = ["--quality"];
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

function normalizeRelPath(value) {
    const normalized = String(value ?? "").replaceAll("\\", "/").replace(/^\/+/, "").trim();
    return normalized || null;
}

function toPosixPath(value) {
    return String(value ?? "").replaceAll("\\", "/");
}

function logSparkRad(status, details = {}) {
    const logger = ["start", "done"].includes(status) ? console.info : console.warn;
    logger(`[HERA][SparkRad] ${status}`, details);
}

function splitArgs(value) {
    const source = String(value ?? "").trim();
    if (!source) return DEFAULT_BUILD_ARGS;

    const matches = source.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
    return matches.map((part) => part.replace(/^"|"$/g, ""));
}

function hasPathSeparator(value) {
    return /[\\/]/.test(String(value ?? ""));
}

function canSpawnTool(toolPath) {
    if (!toolPath) return false;
    if (path.isAbsolute(toolPath) || hasPathSeparator(toolPath)) {
        return fs.existsSync(toolPath);
    }
    return true;
}

function relFromDiskPath(diskPath, apiRoot) {
    return toPosixPath(path.relative(apiRoot, diskPath));
}

function buildLodMeta({
    sourceRel,
    radRel = null,
    chunkRels = [],
    generated = false,
    skippedReason = null,
    failedReason = null,
} = {}) {
    const normalizedSource = normalizeRelPath(sourceRel);
    const sourcePath = normalizedSource ? `/${normalizedSource}` : null;
    const normalizedRad = normalizeRelPath(radRel);
    const radPath = normalizedRad ? `/${normalizedRad}` : null;
    const normalizedChunks = chunkRels
        .map(normalizeRelPath)
        .filter(Boolean)
        .map((chunkRel) => `/${chunkRel}`);

    const lodMeta = {
        assetKind: "splat",
        original: {
            path: sourcePath,
            status: "ready",
        },
        splat: {
            sourcePath,
            streaming: false,
        },
        variants: {},
    };

    if (skippedReason) lodMeta.splat.radSkippedReason = skippedReason;
    if (failedReason) lodMeta.splat.radFailedReason = failedReason;

    if (radPath) {
        lodMeta.splat = {
            ...lodMeta.splat,
            format: "spark-rad",
            streaming: true,
            paged: true,
            chunked: normalizedChunks.length > 0,
            radPath,
            chunkPaths: normalizedChunks,
            generator: "spark-build-lod",
            generated,
        };
        lodMeta.variants.sparkRad = {
            path: radPath,
            status: "ready",
            format: "spark-rad",
            streaming: true,
            paged: true,
            chunked: normalizedChunks.length > 0,
        };
    }

    return lodMeta;
}

function runBuildLod({ toolPath, args, inputDiskPath, cwd, timeoutMs }) {
    return new Promise((resolve) => {
        const child = spawn(toolPath, [inputDiskPath, ...args], {
            cwd,
            windowsHide: true,
        });

        let stdout = "";
        let stderr = "";
        let settled = false;
        const timeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            child.kill("SIGTERM");
            resolve({
                ok: false,
                code: null,
                stdout,
                stderr,
                error: `timed out after ${timeoutMs}ms`,
            });
        }, timeoutMs);

        child.stdout?.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            resolve({
                ok: false,
                code: null,
                stdout,
                stderr,
                error: error?.message ?? String(error),
            });
        });
        child.on("close", (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            resolve({
                ok: code === 0,
                code,
                stdout,
                stderr,
                error: code === 0 ? null : `build-lod exited with code ${code}`,
            });
        });
    });
}

function findRadOutputs({ sourceDiskPath, apiRoot, startedAt }) {
    const dir = path.dirname(sourceDiskPath);
    const sourceExt = path.extname(sourceDiskPath);
    const base = path.basename(sourceDiskPath, sourceExt);
    const expectedRad = path.join(dir, `${base}-lod.rad`);

    const entries = fs.readdirSync(dir)
        .map((name) => {
            const diskPath = path.join(dir, name);
            const stat = fs.statSync(diskPath);
            return {
                name,
                diskPath,
                ext: path.extname(name).toLowerCase(),
                mtimeMs: stat.mtimeMs,
            };
        })
        .filter((entry) =>
            entry.name.startsWith(base)
            && [".rad", ".radc"].includes(entry.ext)
            && entry.mtimeMs >= startedAt - 1000
        );

    const radCandidates = entries
        .filter((entry) => entry.ext === ".rad")
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
    const primaryRad = fs.existsSync(expectedRad)
        ? expectedRad
        : radCandidates[0]?.diskPath ?? null;

    if (!primaryRad) {
        return { radRel: null, chunkRels: [] };
    }

    return {
        radRel: relFromDiskPath(primaryRad, apiRoot),
        chunkRels: entries
            .filter((entry) => entry.ext === ".radc")
            .map((entry) => relFromDiskPath(entry.diskPath, apiRoot)),
    };
}

export function isSplatAssetPath(value) {
    const normalized = normalizeRelPath(value);
    if (!normalized) return false;
    return SPLAT_INPUT_EXTENSIONS.has(path.posix.extname(normalized).toLowerCase());
}

export async function prepareUploadedSplatAsset({
    fileRelPath,
    assetName = null,
    apiRoot = process.cwd(),
    requestedKind = null,
} = {}) {
    const sourceRel = normalizeRelPath(fileRelPath);
    const sourceExt = path.posix.extname(sourceRel ?? "").toLowerCase();
    const kind = String(requestedKind ?? "").trim().toLowerCase();
    const isExplicitSplat = kind === "splat";

    if (!sourceRel || (!isExplicitSplat && !isSplatAssetPath(sourceRel))) return null;

    const sourceDiskPath = path.resolve(apiRoot, sourceRel);
    if (!fs.existsSync(sourceDiskPath)) {
        if (!isExplicitSplat) return null;
        throw new Error(`Uploaded splat file does not exist: ${sourceRel}`);
    }

    if (sourceExt === ".rad") {
        logSparkRad("done", {
            fileRelPath: sourceRel,
            assetName,
            treatment: "using uploaded .rad as Spark optimized variant",
        });
        return {
            url: sourceRel,
            preferredVariant: "sparkRad",
            lodMeta: buildLodMeta({
                sourceRel,
                radRel: sourceRel,
                generated: false,
            }),
        };
    }

    const toolPath = String(process.env.SPARK_BUILD_LOD_PATH ?? "").trim();
    if (!toolPath) {
        logSparkRad("skipped", {
            fileRelPath: sourceRel,
            assetName,
            reason: "SPARK_BUILD_LOD_PATH is not set",
        });
        return {
            url: sourceRel,
            preferredVariant: "original",
            lodMeta: buildLodMeta({
                sourceRel,
                skippedReason: "SPARK_BUILD_LOD_PATH is not set",
            }),
        };
    }

    if (!canSpawnTool(toolPath)) {
        logSparkRad("skipped", {
            fileRelPath: sourceRel,
            assetName,
            toolPath,
            reason: "SPARK_BUILD_LOD_PATH does not point to an executable file",
        });
        return {
            url: sourceRel,
            preferredVariant: "original",
            lodMeta: buildLodMeta({
                sourceRel,
                skippedReason: "SPARK_BUILD_LOD_PATH executable not found",
            }),
        };
    }

    const args = splitArgs(process.env.SPARK_BUILD_LOD_ARGS);
    const timeoutMs = Number(process.env.SPARK_BUILD_LOD_TIMEOUT_MS) > 0
        ? Number(process.env.SPARK_BUILD_LOD_TIMEOUT_MS)
        : DEFAULT_TIMEOUT_MS;
    const startedAt = Date.now();
    logSparkRad("start", {
        fileRelPath: sourceRel,
        assetName,
        toolPath,
        args,
        timeoutMs,
    });
    const result = await runBuildLod({
        toolPath,
        args,
        inputDiskPath: sourceDiskPath,
        cwd: path.dirname(sourceDiskPath),
        timeoutMs,
    });

    if (!result.ok) {
        logSparkRad("failed", {
            fileRelPath: sourceRel,
            assetName,
            toolPath,
            args,
            error: result.error,
            stderr: result.stderr?.slice(0, 2000),
        });
        return {
            url: sourceRel,
            preferredVariant: "original",
            lodMeta: buildLodMeta({
                sourceRel,
                failedReason: result.error,
            }),
        };
    }

    const { radRel, chunkRels } = findRadOutputs({
        sourceDiskPath,
        apiRoot,
        startedAt,
    });

    if (!radRel) {
        logSparkRad("failed", {
            fileRelPath: sourceRel,
            assetName,
            toolPath,
            args,
            reason: "build-lod completed but no .rad output was found beside the uploaded file",
            stdout: result.stdout?.slice(0, 2000),
            stderr: result.stderr?.slice(0, 2000),
        });
        return {
            url: sourceRel,
            preferredVariant: "original",
            lodMeta: buildLodMeta({
                sourceRel,
                failedReason: "build-lod completed without a .rad output",
            }),
        };
    }

    logSparkRad("done", {
        fileRelPath: sourceRel,
        assetName,
        radRel,
        chunkCount: chunkRels.length,
    });

    return {
        url: sourceRel,
        preferredVariant: "sparkRad",
        lodMeta: buildLodMeta({
            sourceRel,
            radRel,
            chunkRels,
            generated: true,
        }),
    };
}
