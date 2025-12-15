export function updateUrl (url, id) {
    const uuidRegex = /public[\\/]{1}files[\\/]{1}([a-f0-9\-]+)[\\/]/i;

    return url?.replace(uuidRegex, `public/files/${id}/`);
}