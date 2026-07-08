import "../../config.js";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { inspectPotreeDatasetDirectory } from "./potreeDataset.js";
import { inspectPlyPointCloudFile } from "./staticPointCloud.js";
import { convertPlyToLas } from "./plyToLas.js";

const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const MAX_CAPTURED_LOG_CHARS = 16000;
const SETUP_HINT = 'Set POTREE_CONVERTER_PATH to the PotreeConverter executable, for example: $env:POTREE_CONVERTER_PATH="C:\\path\\to\\PotreeConverter.exe"';

function normalizeRelPath(value = "") {
    return String(value ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function stripOuterQuotes(value = "") {
    return String(value ?? "").trim().replace(/^["']|["']$/g, "");
}

function uniqueByPath(candidates) {
    const seen = new Set();
    return candidates.filter((candidate) => {
        if (!candidate?.path) return false;
        const key = `${candidate.source}:${candidate.path}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function envStatus(name) {
    return process.env[name] ? "set" : "not set";
}

function resolveRepoRoot(apiRoot = process.cwd()) {
    const root = path.resolve(apiRoot);
    const candidates = [
        root,
        path.resolve(root, ".."),
        path.resolve(root, "..", ".."),
    ];

    return candidates.find((candidate) => fs.existsSync(path.join(candidate, "scripts", "tools")))
        ?? path.resolve(root, "..", "..");
}

function resolveCandidatePath(value, baseDir = process.cwd()) {
    const candidate = stripOuterQuotes(value);
    if (!candidate) return null;
    return path.isAbsolute(candidate) ? candidate : path.resolve(baseDir, candidate);
}

function configuredConverterCandidates(apiRoot = process.cwd()) {
    const candidates = [];

    for (const envName of ["POTREE_CONVERTER_PATH", "POTREE_CONVERTER"]) {
        const raw = process.env[envName];
        if (!raw) continue;

        const cwdResolved = resolveCandidatePath(raw, process.cwd());
        if (cwdResolved) {
            candidates.push({
                source: envName,
                path: cwdResolved,
                envName,
                isConfigured: true,
            });
        }

        const apiRootResolved = resolveCandidatePath(raw, apiRoot);
        if (apiRootResolved && apiRootResolved !== cwdResolved) {
            candidates.push({
                source: `${envName} (apiRoot-relative)`,
                path: apiRootResolved,
                envName,
                isConfigured: true,
            });
        }
    }

    return candidates;
}

function localConverterCandidates(apiRoot = process.cwd()) {
    const repoRoot = resolveRepoRoot(apiRoot);
    const executableNames = process.platform === "win32"
        ? ["PotreeConverter.exe"]
        : ["PotreeConverter", "PotreeConverter.exe"];
    const bundledToolPath = path.join(
        ".hera-tools",
        "PotreeConverter_2.1.1_x64_windows",
        "PotreeConverter_windows_x64",
        "PotreeConverter.exe"
    );
    const roots = [
        repoRoot,
        apiRoot,
        process.cwd(),
        path.resolve(process.cwd(), ".."),
        path.resolve(process.cwd(), "..", ".."),
    ];
    const candidates = [];

    for (const root of roots) {
        for (const executableName of executableNames) {
            candidates.push({
                source: "scripts-tools",
                path: path.join(root, "scripts", "tools", executableName),
            });
        }
    }

    for (const root of roots) {
        candidates.push({
            source: "repo-default",
            path: path.resolve(root, bundledToolPath),
        });
    }

    return uniqueByPath(candidates);
}

function candidateWithExists(candidate) {
    return {
        ...candidate,
        exists: fs.existsSync(candidate.path),
    };
}

function sanitizeCandidateForApi(candidate) {
    if (!candidate?.isConfigured) return candidate;
    return {
        ...candidate,
        path: candidate.path ? "<configured path hidden>" : "",
    };
}

export function resolvePotreeConverter({ apiRoot = process.cwd() } = {}) {
    const checkedPaths = uniqueByPath([
        ...configuredConverterCandidates(apiRoot),
        ...localConverterCandidates(apiRoot),
    ]).map(candidateWithExists);
    const found = checkedPaths.find((candidate) => candidate.exists) ?? null;

    return {
        available: Boolean(found),
        source: found?.source ?? null,
        toolPath: found?.path ?? null,
        checkedPaths,
        env: {
            POTREE_CONVERTER_PATH: envStatus("POTREE_CONVERTER_PATH"),
            POTREE_CONVERTER: envStatus("POTREE_CONVERTER"),
        },
        setupHint: SETUP_HINT,
    };
}

function formatConverterDiagnostics(resolved, { redactConfiguredPaths = true } = {}) {
    const checkedPaths = resolved.checkedPaths
        .map((candidate) => redactConfiguredPaths ? sanitizeCandidateForApi(candidate) : candidate)
        .map((candidate) => `- ${candidate.source}: ${candidate.path} (${candidate.exists ? "found" : "missing"})`)
        .join("\n");

    return [
        `Environment: POTREE_CONVERTER_PATH=${resolved.env.POTREE_CONVERTER_PATH}, POTREE_CONVERTER=${resolved.env.POTREE_CONVERTER}.`,
        `Checked paths:\n${checkedPaths || "- none"}`,
        `Setup: ${resolved.setupHint}`,
    ].join("\n");
}

export function logPotreeConverterStatus({ apiRoot = process.cwd() } = {}) {
    const resolved = resolvePotreeConverter({ apiRoot });
    const details = {
        source: resolved.source,
        toolPath: resolved.toolPath,
        env: resolved.env,
        checkedPaths: resolved.checkedPaths,
    };

    if (resolved.available) {
        console.info("[HERA][PotreeConverter] found", details);
        return resolved;
    }

    console.warn("[HERA][PotreeConverter] missing", {
        ...details,
        setup: resolved.setupHint,
    });
    return resolved;
}

function ensureConverterPath({ apiRoot = process.cwd() } = {}) {
    const resolved = resolvePotreeConverter({ apiRoot });
    if (!resolved.available) {
        throw buildConverterConfigError(resolved);
    }
    return resolved.toolPath;
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

function buildConverterConfigError(resolved) {
    console.warn("[HERA][PotreeConverter] missing", {
        env: resolved.env,
        checkedPaths: resolved.checkedPaths,
        setup: resolved.setupHint,
    });

    const error = new Error(
        "Potree conversion skipped: executable missing. " +
        "Classic .ply point clouds must be converted to Potree before streaming.\n\n" +
        formatConverterDiagnostics(resolved)
    );
    error.code = "POTREE_CONVERTER_MISSING";
    error.diagnostics = {
        reason: "executable-missing",
        env: resolved.env,
        checkedPaths: resolved.checkedPaths.map(sanitizeCandidateForApi),
        setupHint: resolved.setupHint,
    };
    return error;
}

function buildInputNotRecognizedError({ assetKind, header }) {
    const isSplat = assetKind === "splat";
    const reason = isSplat
        ? "input was recognized as a Gaussian splat, not a classic point cloud"
        : "input was not recognized as a classic .ply point cloud";
    const requirement = isSplat
        ? "Upload it as a splat, or use a classic point-cloud PLY for Potree conversion."
        : "Classic point cloud .ply must contain vertex x, y, and z properties.";

    const error = new Error(
        `Potree conversion skipped: ${reason}. ${requirement}`
    );
    error.code = "POINT_CLOUD_INPUT_NOT_RECOGNIZED";
    error.diagnostics = {
        reason: "input-not-recognized",
        detectedAssetKind: assetKind ?? null,
        plyFormat: header?.format ?? null,
        pointCount: header?.pointCount ?? null,
        vertexProperties: header?.vertexProperties ?? [],
    };
    return error;
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

async function runPotreeConverter({ inputPath, outputDir, converterPath }) {
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
        if (!strict) {
            console.info("[HERA][PotreeConverter] skipped", {
                fileRelPath: normalizedRel,
                assetName,
                reason: "input-not-recognized",
                detectedAssetKind: assetKind,
                vertexProperties: header.vertexProperties,
            });
            return null;
        }

        throw buildInputNotRecognizedError({ assetKind, header });
    }

    const outputDir = path.join(
        path.dirname(diskPath),
        `${path.basename(diskPath, path.extname(diskPath))}_potree`
    );
    const tempLasPath = path.join(
        path.dirname(diskPath),
        `${path.basename(diskPath, path.extname(diskPath))}_potree_source.las`
    );

    const converterPath = ensureConverterPath({ apiRoot });

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
            converterPath,
            converterInput: tempLasPath,
            sourceEncoding: header.format,
            sourcePointCount: lasInfo.pointCount,
            outputDir,
        });

        await runPotreeConverter({ inputPath: tempLasPath, outputDir, converterPath });
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
