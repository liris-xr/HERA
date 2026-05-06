import path from "node:path";
import fs from "node:fs";

export function normalizePath(p) {
    if (!p) return null;
    const s = String(p).replaceAll("\\", "/").trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    return s.startsWith("/") ? s : `/${s}`;
}

export function toInputRel(url) {
    return String(url ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
}

export function makeVariantRel(inputRel, suffix) {
    const dirRel = path.posix.dirname(inputRel);
    const base = path.posix.basename(inputRel, path.posix.extname(inputRel));
    const ext = path.posix.extname(inputRel) || ".glb";
    return path.posix.join(dirRel, `${base}_${suffix}${ext}`);
}

export function fileExists(p) {
    try {
        fs.accessSync(p);
        return true;
    } catch {
        return false;
    }
}

function parseLodMeta(raw) {
    if (!raw) return {};
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw) ?? {};
        } catch {
            return {};
        }
    }
    return typeof raw === "object" ? raw : {};
}

function cleanMetricMeta(meta) {
    if (!meta || typeof meta !== "object") return {};
    const { path: _path, status: _status, ...rest } = meta;
    return rest;
}

function relFromMeta(meta, fallbackRel) {
    const metaRel = toInputRel(meta?.path);
    return metaRel || fallbackRel;
}

function buildVariantEntry({ ready, rel, meta = {} }) {
    return {
        ...cleanMetricMeta(meta),
        status: ready ? "ready" : "missing",
        path: ready ? normalizePath(rel) : null,
    };
}

export function buildVariantSet(asset, apiRoot) {
    const sourceRel = toInputRel(asset?.url);
    const lodMeta = parseLodMeta(asset?.lodMeta);

    if (!sourceRel) {
        return {
            original: { status: "missing", path: null },
            simplified: { status: "missing", path: null },
            n1: { status: "missing", path: null },
            n2: { status: "missing", path: null },
            n3: { status: "missing", path: null },
        };
    }

    const originalRel = relFromMeta(lodMeta.original, sourceRel);
    const originalDisk = path.resolve(apiRoot, originalRel);

    const n1Rel = relFromMeta(lodMeta.variants?.n1, makeVariantRel(sourceRel, "n1"));
    const n2Rel = relFromMeta(lodMeta.variants?.n2, makeVariantRel(sourceRel, "n2"));
    const n3Rel = relFromMeta(lodMeta.variants?.n3, makeVariantRel(sourceRel, "n3"));

    const n1Disk = path.resolve(apiRoot, n1Rel);
    const n2Disk = path.resolve(apiRoot, n2Rel);
    const n3Disk = path.resolve(apiRoot, n3Rel);

    const originalReady = fileExists(originalDisk);
    const n1Ready = fileExists(n1Disk);
    const n2Ready = fileExists(n2Disk);
    const n3Ready = fileExists(n3Disk);

    return {
        original: buildVariantEntry({
            ready: originalReady,
            rel: originalRel,
            meta: lodMeta.original,
        }),
        simplified: buildVariantEntry({
            ready: n1Ready,
            rel: n1Rel,
            meta: lodMeta.variants?.n1,
        }),
        n1: buildVariantEntry({
            ready: n1Ready,
            rel: n1Rel,
            meta: lodMeta.variants?.n1,
        }),
        n2: buildVariantEntry({
            ready: n2Ready,
            rel: n2Rel,
            meta: lodMeta.variants?.n2,
        }),
        n3: buildVariantEntry({
            ready: n3Ready,
            rel: n3Rel,
            meta: lodMeta.variants?.n3,
        }),
    };
}
