import { ENDPOINT } from "@/js/endpoints.js";
export { pickVariantFromManifest } from "./assetManifestVariants.js";

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

