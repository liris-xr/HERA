import { ASSET_KINDS } from "../assetKinds.js";

const MAX_PLY_HEADER_BYTES = 1024 * 1024;

function normalizePropertyName(value = "") {
    return String(value ?? "").trim().toLowerCase();
}

function propertyNameFromLine(line = "") {
    const parts = String(line).trim().split(/\s+/);
    if (parts[1] === "list") return parts[parts.length - 1] ?? "";
    return parts[parts.length - 1] ?? "";
}

function hasAnyPrefix(properties, prefixes) {
    for (const property of properties) {
        for (const prefix of prefixes) {
            if (property.startsWith(prefix)) return true;
        }
    }
    return false;
}

function hasPosition(properties) {
    return properties.has("x") && properties.has("y") && properties.has("z");
}

function looksLikeGaussianSplat(properties) {
    let score = 0;

    if (hasAnyPrefix(properties, ["f_dc_", "f_rest_"])) score++;
    if (properties.has("opacity")) score++;
    if (hasAnyPrefix(properties, ["scale_"])) score++;
    if (hasAnyPrefix(properties, ["rot_"])) score++;

    return score >= 2;
}

export function parsePlyHeader(headerText = "") {
    const lines = String(headerText ?? "").split(/\r?\n/);
    const firstLine = lines[0]?.trim().toLowerCase();

    if (firstLine !== "ply") {
        return { isPly: false, format: null, vertexCount: null, vertexProperties: [] };
    }

    let format = null;
    let vertexCount = null;
    let currentElement = null;
    const vertexProperties = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line === "ply" || line === "end_header") continue;

        const [keyword, ...rest] = line.split(/\s+/);
        const normalizedKeyword = keyword.toLowerCase();

        if (normalizedKeyword === "comment" || normalizedKeyword === "obj_info") continue;

        if (normalizedKeyword === "format") {
            format = rest[0] ?? null;
            continue;
        }

        if (normalizedKeyword === "element") {
            currentElement = rest[0] ?? null;
            if (currentElement === "vertex") {
                const count = Number(rest[1]);
                vertexCount = Number.isFinite(count) ? count : null;
            }
            continue;
        }

        if (normalizedKeyword === "property" && currentElement === "vertex") {
            vertexProperties.push(normalizePropertyName(propertyNameFromLine(line)));
        }
    }

    return {
        isPly: true,
        format,
        vertexCount,
        vertexProperties,
    };
}

export function classifyPlyHeader(header) {
    if (!header?.isPly) return null;

    const properties = new Set((header.vertexProperties ?? []).map(normalizePropertyName));
    if (!hasPosition(properties)) return null;

    if (looksLikeGaussianSplat(properties)) {
        return ASSET_KINDS.SPLAT;
    }

    return ASSET_KINDS.POINTCLOUD;
}

export async function detectPlyAssetKindFromFile(file, fallback = ASSET_KINDS.SPLAT) {
    if (!file || typeof file.slice !== "function") return fallback;

    const headerText = await file.slice(0, MAX_PLY_HEADER_BYTES).text();
    const endHeaderIndex = headerText.indexOf("end_header");

    if (endHeaderIndex === -1) return fallback;

    const header = parsePlyHeader(headerText.slice(0, endHeaderIndex + "end_header".length));
    return classifyPlyHeader(header) ?? fallback;
}
