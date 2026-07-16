import { ENDPOINT } from "@/js/endpoints.js";
import { isQuestOrOculusBrowser } from "@/js/threeExt/DeviceProfile/devicePolicy.js";

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

export function pickVariantFromManifest(manifest, options = {}) {
    const variantOverride = options.variantOverride ?? null;
    const allowFallback = options.allowFallback ?? true;

    const variants = manifest?.variants || {};

    function isReady(v) {
        return v && v.status === "ready" && v.path;
    }

    function abs(p) {
        return p?.startsWith("/") ? p : `/${p}`;
    }

    const hasReadySparkRad = manifest?.assetKind === "splat" && isReady(variants.sparkRad);
    const preferSparkRadForRuntime =
        hasReadySparkRad &&
        (options.preferSparkRad === true ||
            (options.preferSparkRad !== false && isQuestOrOculusBrowser()));
    const preferred = variantOverride ||
        (preferSparkRadForRuntime ? "sparkRad" : manifest?.preferredVariant || (hasReadySparkRad ? "sparkRad" : "original"));

    let chosenKey = preferred;
    let chosen = variants[chosenKey];

    if (!isReady(chosen) && allowFallback) {
        const fallbackOrder = manifest?.assetKind === "splat"
            ? ["sparkRad", "original", "n1", "n2", "n3", "simplified"]
            : ["original", "n1", "n2", "n3", "simplified"];
        chosenKey = fallbackOrder.find((k) => isReady(variants[k]));
        chosen = chosenKey ? variants[chosenKey] : null;
    }

    if (!isReady(chosen)) {
        throw new Error(`No ready variant for asset ${manifest?.assetId}`);
    }

    return {
        variant: chosenKey,
        path: abs(chosen.path),
        meta: chosen,
    };
}
