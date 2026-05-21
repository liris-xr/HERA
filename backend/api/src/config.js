import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DEV_JWT_SECRET = "hera-dev-only-insecure-secret";

const currentFile = fileURLToPath(import.meta.url);
const apiRoot = path.resolve(path.dirname(currentFile), "..");

function loadEnvFileIfPresent(filePath) {
    if (!fs.existsSync(filePath)) return;

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!match) continue;

        const [, key, rawValue] = match;
        if (process.env[key] !== undefined) continue;

        process.env[key] = rawValue
            .replace(/^"(.*)"$/, "$1")
            .replace(/^'(.*)'$/, "$1");
    }
}

loadEnvFileIfPresent(path.join(apiRoot, ".env"));

const isProduction = process.env.NODE_ENV === "production";

export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_JWT_SECRET;

if (isProduction && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in production.");
}

export const USING_DEV_JWT_SECRET = JWT_SECRET === DEFAULT_DEV_JWT_SECRET;
