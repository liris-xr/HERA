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

export function buildVariantSet(asset, apiRoot) {
    const originalRel = toInputRel(asset?.url);

    if (!originalRel) {
        return {
            original: { status: "missing", path: null },
            simplified: { status: "missing", path: null },
            n1: { status: "missing", path: null },
            n2: { status: "missing", path: null },
            n3: { status: "missing", path: null },
        };
    }

    const originalDisk = path.resolve(apiRoot, originalRel);

    const n1Rel = makeVariantRel(originalRel, "n1");
    const n2Rel = makeVariantRel(originalRel, "n2");
    const n3Rel = makeVariantRel(originalRel, "n3");

    const n1Disk = path.resolve(apiRoot, n1Rel);
    const n2Disk = path.resolve(apiRoot, n2Rel);
    const n3Disk = path.resolve(apiRoot, n3Rel);

    const originalReady = fileExists(originalDisk);
    const n1Ready = fileExists(n1Disk);
    const n2Ready = fileExists(n2Disk);
    const n3Ready = fileExists(n3Disk);

    return {
        original: {
            status: originalReady ? "ready" : "missing",
            path: originalReady ? normalizePath(originalRel) : null,
        },
        simplified: {
            status: n1Ready ? "ready" : "missing",
            path: n1Ready ? normalizePath(n1Rel) : null,
        },
        n1: {
            status: n1Ready ? "ready" : "missing",
            path: n1Ready ? normalizePath(n1Rel) : null,
        },
        n2: {
            status: n2Ready ? "ready" : "missing",
            path: n2Ready ? normalizePath(n2Rel) : null,
        },
        n3: {
            status: n3Ready ? "ready" : "missing",
            path: n3Ready ? normalizePath(n3Rel) : null,
        },
    };
}