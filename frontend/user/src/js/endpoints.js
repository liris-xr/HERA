export const BASE_URL = import.meta.env.BASE_URL; // "/viewer/" in this app

const API_PORT = import.meta.env.VITE_API_PORT || "8080";
const FRONTEND_PORT = import.meta.env.VITE_FRONTEND_PORT || window.location.port || "8081";

function hostForUrl(hostname) {
    const cleanHost = hostname || "localhost";
    return cleanHost.includes(":") && !cleanHost.startsWith("[") ? `[${cleanHost}]` : cleanHost;
}

const CURRENT_HOST = hostForUrl(window.location.hostname);
const inferredApiOrigin = `https://${CURRENT_HOST}:${API_PORT}`;

export const API_ORIGIN = import.meta.env.PROD && import.meta.env.VITE_API_ORIGIN
    ? import.meta.env.VITE_API_ORIGIN
    : inferredApiOrigin;
export const ENDPOINT = `${API_ORIGIN}/api/`;

export const HEADERS = { "Content-Type": "application/json" };

export const getResource = (url) => {
    if (!url) return null;
    const p = String(url).replaceAll("\\", "/").trim();
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    return `${API_ORIGIN}/${p.startsWith("/") ? p.slice(1) : p}`;
};

export const getCertUrl = () =>
    `${API_ORIGIN}/api/dev/cert?redirect=` + encodeURIComponent(window.location.href);

export const getDevCertificateUrls = () => ({
    backend: `https://${CURRENT_HOST}:${API_PORT}`,
    frontend: `https://${CURRENT_HOST}:${FRONTEND_PORT}`,
});
