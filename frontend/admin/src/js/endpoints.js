/*// const HOST = 'https://192.168.83.116';
//const HOST = 'https://localhost';
// const HOST = 'https://172.22.69.22';
const HOST = 'https://10.42.205.102'

export const ENDPOINT = `${HOST}:8080/api/`;

export const HEADERS= {
    'Content-Type': "application/json"
};

export const BASE_URL = "/editor/";

const RESOURCES_SERVER = `${HOST}:8080/`;

export const getResource = (url) => url == null ? null : RESOURCES_SERVER + url;



export const getCertUrl = () => `${RESOURCES_SERVER}api/dev/cert?redirect=` + encodeURIComponent(window.location.href)
*/
// src/js/endpoints.js  (same file in admin + user)

export const BASE_URL = import.meta.env.BASE_URL; // "/editor/" or "/viewer/" depending on app

const HOSTNAME = window.location.hostname;        // localhost OR 10.42... depending on URL you open
const PROTOCOL = window.location.protocol;        // https: or http:

// Backend origin (your API server)
export const API_ORIGIN = `${PROTOCOL}//${HOSTNAME}:8080`;
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
