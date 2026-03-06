import { ENDPOINT, getResource } from "@/js/endpoints.js";

export async function fetchAssetManifest(assetId, token = null) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${ENDPOINT}assets/${assetId}/manifest`, { headers });

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Manifest not JSON (status=${res.status}). First chars: ${txt.slice(0, 60)}`);
    }

    const json = await res.json();
    if (!res.ok) {
        throw new Error(json?.error || `Manifest error ${res.status}`);
    }
    return json;
}

/**
 * options:
 * - variantOverride: "original" | "simplified"
 * - allowFallback: boolean (default true)
 */
export function pickVariantFromManifest(manifest, options = {}) {
    const variantOverride = options.variantOverride ?? null;
    const allowFallback = options.allowFallback ?? true;

    const preferred = variantOverride || manifest.preferredVariant || "original";
    const v = manifest.variants || {};
    const original = v.original;
    const simplified = v.simplified;

    function isReady(x) { return x && x.status === "ready" && x.path; }
    function abs(p) { return p?.startsWith("/") ? p : `/${p}`; }

    let chosen = preferred === "simplified" ? simplified : original;

    if (!isReady(chosen) && allowFallback) chosen = isReady(original) ? original : simplified;
    if (!isReady(chosen)) throw new Error(`No ready variant for asset ${manifest.assetId}`);

    return {
        variant: chosen === simplified ? "simplified" : "original",
        path: abs(chosen.path),
    };
}