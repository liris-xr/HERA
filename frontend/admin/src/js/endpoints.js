// const HOST = 'https://192.168.83.116';

// the devices understand at which ip (Raspberry) they need to send the request
const HOST = window.location.protocol + '//' + window.location.hostname;

// const HOST = 'https://172.22.69.22';

export const ENDPOINT = `${HOST}:8080/api/`;

export const HEADERS= {
    'Content-Type': "application/json"
};

export const BASE_URL = "/editor/";

const RESOURCES_SERVER = `${HOST}:8080/`;

export const getResource = (url) => (url == null || url.includes('://')) ? url : RESOURCES_SERVER + url;



export const getCertUrl = () => `${RESOURCES_SERVER}api/dev/cert?redirect=` + encodeURIComponent(window.location.href)
