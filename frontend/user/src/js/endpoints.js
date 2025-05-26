// const HOST = 'https://192.168.40.116';
// const HOST = 'https://localhost';
const HOST = 'https://192.168.1.10';

export const ENDPOINT = `${HOST}:8080/api/`;

export const HEADERS= {
    'Content-Type': "application/json"
};

export const BASE_URL = "/viewer/";

const RESOURCES_SERVER = `${HOST}:8080/`;

export const getResource = (url) => url == null ? null : RESOURCES_SERVER + url;

export const getCertUrl = () => `${RESOURCES_SERVER}api/dev/cert?redirect=` + encodeURIComponent(window.location.href)




