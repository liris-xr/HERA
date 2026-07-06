#!/usr/bin/env node

import childProcess from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const certDir = path.join(projectRoot, "certs");
const toolsDir = path.join(projectRoot, ".hera-tools", "mkcert");
const caDir = path.join(projectRoot, ".hera-tools", "mkcert-ca");
const metaPath = path.join(certDir, "dev-cert.json");
const keyRel = "certs/dev-key.pem";
const certRel = "certs/dev.pem";
const keyPath = path.join(projectRoot, keyRel);
const certPath = path.join(projectRoot, certRel);
const args = new Set(process.argv.slice(2));
const force = args.has("--force") || args.has("-f");
const envOnly = args.has("--env-only");

function isPrivateIPv4(address) {
    const parts = address.split(".").map((part) => Number.parseInt(part, 10));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
    const [a, b] = parts;
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function looksVirtualInterface(name) {
    return /virtual|vmware|vbox|loopback|docker|hyper-v|wsl|tailscale|zerotier/i.test(name);
}

function detectLanIp() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const [name, values] of Object.entries(interfaces)) {
        for (const value of values || []) {
            const family = value.family === "IPv4" || value.family === 4;
            if (!family || value.internal || value.address.startsWith("169.254.")) continue;

            candidates.push({
                address: value.address,
                score: (isPrivateIPv4(value.address) ? 10 : 0) - (looksVirtualInterface(name) ? 5 : 0),
            });
        }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.address || null;
}

function getHosts(lanIp) {
    return Array.from(new Set(["localhost", "127.0.0.1", "::1", lanIp].filter(Boolean)));
}

function spawnOk(command, commandArgs) {
    const result = childProcess.spawnSync(command, commandArgs, { stdio: "ignore" });
    return !result.error && result.status === 0;
}

function mkcertOnPath() {
    const command = process.platform === "win32" ? "mkcert.exe" : "mkcert";
    return spawnOk(command, ["-version"]) ? command : null;
}

function platformAssetNeedle() {
    const archMap = {
        x64: "amd64",
        arm64: "arm64",
        ia32: "386",
    };
    const platformMap = {
        win32: "windows",
        darwin: "darwin",
        linux: "linux",
    };
    const platform = platformMap[process.platform];
    const arch = archMap[process.arch];

    if (!platform || !arch) {
        throw new Error(`Unsupported platform for mkcert auto-download: ${process.platform}/${process.arch}`);
    }

    return process.platform === "win32" ? `${platform}-${arch}.exe` : `${platform}-${arch}`;
}

function requestBuffer(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const request = https.get(
            url,
            {
                headers: {
                    "User-Agent": "hera-dev-https-setup",
                    Accept: "application/vnd.github+json, application/octet-stream",
                },
            },
            (response) => {
                if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
                    response.resume();
                    if (redirectCount > 5) {
                        reject(new Error(`Too many redirects while downloading ${url}`));
                        return;
                    }
                    resolve(requestBuffer(new URL(response.headers.location, url).toString(), redirectCount + 1));
                    return;
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    response.resume();
                    reject(new Error(`Request failed (${response.statusCode}) for ${url}`));
                    return;
                }

                const chunks = [];
                response.on("data", (chunk) => chunks.push(chunk));
                response.on("end", () => resolve(Buffer.concat(chunks)));
            },
        );

        request.on("error", reject);
    });
}

async function latestMkcertAsset() {
    const releaseBuffer = await requestBuffer("https://api.github.com/repos/FiloSottile/mkcert/releases/latest");
    const release = JSON.parse(releaseBuffer.toString("utf8"));
    const needle = platformAssetNeedle();
    const asset = release.assets?.find((item) => item.name.includes(needle));

    if (!asset?.browser_download_url) {
        throw new Error(`Could not find a mkcert release asset matching ${needle}`);
    }

    return asset.browser_download_url;
}

async function ensureMkcert() {
    const pathCommand = mkcertOnPath();
    if (pathCommand) return pathCommand;

    await fsp.mkdir(toolsDir, { recursive: true });
    const binaryPath = path.join(toolsDir, process.platform === "win32" ? "mkcert.exe" : "mkcert");

    if (fs.existsSync(binaryPath) && spawnOk(binaryPath, ["-version"])) {
        return binaryPath;
    }

    console.log("mkcert was not found on PATH. Downloading a local copy...");
    const downloadUrl = await latestMkcertAsset();
    const binary = await requestBuffer(downloadUrl);
    await fsp.writeFile(binaryPath, binary, { mode: 0o755 });
    await fsp.chmod(binaryPath, 0o755);

    return binaryPath;
}

async function readJsonIfPresent(filePath) {
    try {
        return JSON.parse(await fsp.readFile(filePath, "utf8"));
    } catch {
        return null;
    }
}

function sameHosts(left, right) {
    return JSON.stringify([...(left || [])].sort()) === JSON.stringify([...(right || [])].sort());
}

async function generateCertificateIfNeeded(mkcertCommand, hosts, lanIp) {
    await fsp.mkdir(certDir, { recursive: true });
    await fsp.mkdir(caDir, { recursive: true });

    const meta = await readJsonIfPresent(metaPath);
    const filesExist = fs.existsSync(keyPath) && fs.existsSync(certPath);
    const shouldGenerate = force || !filesExist || !sameHosts(meta?.hosts, hosts);

    if (!shouldGenerate) {
        console.log("Existing dev certificate already matches the detected hosts.");
        return false;
    }

    const mkcertArgs = [
        "-install",
        "-key-file",
        keyPath,
        "-cert-file",
        certPath,
        ...hosts,
    ];

    console.log(`Generating dev certificate for: ${hosts.join(", ")}`);
    const result = childProcess.spawnSync(mkcertCommand, mkcertArgs, {
        cwd: projectRoot,
        env: { ...process.env, CAROOT: caDir, JAVA_HOME: "" },
        stdio: "inherit",
    });

    if (result.error || result.status !== 0) {
        throw result.error || new Error(`mkcert failed with exit code ${result.status}`);
    }

    await fsp.writeFile(
        metaPath,
        `${JSON.stringify({
            generatedAt: new Date().toISOString(),
            lanIp,
            hosts,
            keyPath: keyRel,
            certPath: certRel,
        }, null, 2)}\n`,
        "utf8",
    );

    return true;
}

async function readEnvLines(filePath) {
    try {
        return (await fsp.readFile(filePath, "utf8")).split(/\r?\n/);
    } catch {
        return [];
    }
}

function upsertEnvValue(lines, key, value) {
    const pattern = new RegExp(`^\\s*${key}\\s*=`);
    const nextLine = `${key}=${value}`;
    const index = lines.findIndex((line) => pattern.test(line));

    if (index >= 0) {
        lines[index] = nextLine;
    } else {
        if (lines.length && lines[lines.length - 1] !== "") lines.push("");
        lines.push(nextLine);
    }
}

function removeEnvValues(lines, keys) {
    const patterns = keys.map((key) => new RegExp(`^\\s*${key}\\s*=`));
    return lines.filter((line) => !patterns.some((pattern) => pattern.test(line)));
}

async function writeEnvFile(filePath, entries, removeKeys = []) {
    let lines = await readEnvLines(filePath);
    lines = removeEnvValues(lines, removeKeys);

    for (const [key, value] of Object.entries(entries)) {
        upsertEnvValue(lines, key, value);
    }

    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    await fsp.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

async function updateEnvFiles() {
    await writeEnvFile(path.join(projectRoot, "backend/api/.env"), {
        NODE_ENV: "development",
        PORT: "8080",
        CORS_ORIGIN: "*",
        HTTPS_KEY_PATH: keyRel,
        HTTPS_CERT_PATH: certRel,
    });

    await writeEnvFile(
        path.join(projectRoot, "frontend/user/.env"),
        {
            VITE_API_PORT: "8080",
            VITE_FRONTEND_PORT: "8081",
        },
        ["VITE_API_ORIGIN", "VITE_API_TARGET", "VITE_DEV_API_TARGET"],
    );

    await writeEnvFile(
        path.join(projectRoot, "frontend/admin/.env"),
        {
            VITE_API_PORT: "8080",
            VITE_FRONTEND_PORT: "8082",
        },
        ["VITE_API_ORIGIN", "VITE_API_TARGET", "VITE_DEV_API_TARGET"],
    );
}

function printUrls(lanIp, hosts, generated) {
    console.log("");
    console.log("HERA dev HTTPS setup complete.");
    console.log(`Detected LAN IP: ${lanIp || "none"}`);
    console.log(envOnly
        ? `Certificate generation skipped for: ${hosts.join(", ")}`
        : `Certificate ${generated ? "generated" : "validated"} for: ${hosts.join(", ")}`);
    console.log("");
    console.log("Open these URLs once in the browser and accept the local certificate if prompted:");
    console.log("  Backend/API: https://localhost:8080");
    console.log("  Viewer:      https://localhost:8081");
    console.log("  Editor:      https://localhost:8082");

    if (lanIp) {
        console.log("");
        console.log("For another device on the same LAN, use:");
        console.log(`  Backend/API: https://${lanIp}:8080`);
        console.log(`  Viewer:      https://${lanIp}:8081/viewer/`);
        console.log(`  Editor:      https://${lanIp}:8082/editor/`);
    }

    console.log("");
    console.log("If your LAN IP changes, rerun this script. Use --force to regenerate even when hosts look unchanged.");
}

async function main() {
    const lanIp = detectLanIp();
    const hosts = getHosts(lanIp);
    let generated = false;

    if (envOnly) {
        console.log("Skipping certificate generation because --env-only was provided.");
    } else {
        const mkcertCommand = await ensureMkcert();
        generated = await generateCertificateIfNeeded(mkcertCommand, hosts, lanIp);
    }

    await updateEnvFiles();
    printUrls(lanIp, hosts, generated);
}

main().catch((error) => {
    console.error("");
    console.error("Failed to set up dev HTTPS.");
    console.error(error?.message || error);
    process.exitCode = 1;
});
