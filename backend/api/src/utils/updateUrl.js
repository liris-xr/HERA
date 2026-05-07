export function updateUrl (url, id, baseUrl = "") {
    const uuidRegex = /(?:https?:\/\/[^\/]+\/)?public[\\/]{1}files[\\/]{1}([a-f0-9\-]+)[\\/]/gi;
    const prefix = baseUrl ? (baseUrl.endsWith('/') ? baseUrl : baseUrl + '/') : '';

    return url?.replace(uuidRegex, `${prefix}public/files/${id}/`);
}