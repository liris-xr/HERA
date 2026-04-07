import { ENDPOINT } from "@/js/endpoints.js";

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
    console.log("[fetchAssetManifest] token present:", !!token);
    return json;
}

export function pickVariantFromManifest(manifest, options = {}) {
    const variantOverride = options.variantOverride ?? null;
    const allowFallback = options.allowFallback ?? true;

    const variants = manifest?.variants || {};
    const preferred = variantOverride || manifest?.preferredVariant || "original";

    function isReady(v) {
        return v && v.status === "ready" && v.path;
    }

    function abs(p) {
        return p?.startsWith("/") ? p : `/${p}`;
    }

    let chosenKey = preferred;
    let chosen = variants[chosenKey];

    if (!isReady(chosen) && allowFallback) {
        const fallbackOrder = ["original", "n1", "n2", "n3", "simplified"];
        chosenKey = fallbackOrder.find((k) => isReady(variants[k]));
        chosen = chosenKey ? variants[chosenKey] : null;
    }

    if (!isReady(chosen)) {
        throw new Error(`No ready variant for asset ${manifest?.assetId}`);
    }

    return {
        variant: chosenKey,
        path: abs(chosen.path),
    };
}