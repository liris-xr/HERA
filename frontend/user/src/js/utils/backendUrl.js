export function apiOrigin() {
    return import.meta.env.VITE_API_ORIGIN || window.location.origin;
}

export function toBackendUrl(pathOrUrl) {
    if (!pathOrUrl) return null;
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return new URL(p, apiOrigin()).toString();
}