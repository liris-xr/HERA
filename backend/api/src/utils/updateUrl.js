export function updateUrl (url, id) {
    if (url == null) return url;

    const uuidRegex = /public[\\/]{1}files[\\/]{1}([a-z0-9\-]+)[\\/]/i;

    return String(url).replace(uuidRegex, `public/files/${id}/`);
}

function parseJsonValue(value) {
    if (!value || typeof value !== "string") return value ?? null;

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

export function updateStoredFileUrls(value, id) {
    const parsed = parseJsonValue(value);

    if (typeof parsed === "string") {
        return updateUrl(parsed, id);
    }

    if (Array.isArray(parsed)) {
        return parsed.map((item) => updateStoredFileUrls(item, id));
    }

    if (parsed && typeof parsed === "object") {
        return Object.fromEntries(
            Object.entries(parsed).map(([key, item]) => [
                key,
                updateStoredFileUrls(item, id),
            ])
        );
    }

    return parsed;
}

export function updateAssetFileReferences(asset, id) {
    return {
        url: updateUrl(asset?.url, id),
        simplifiedUrl: updateUrl(asset?.simplifiedUrl, id),
        lodMeta: updateStoredFileUrls(asset?.lodMeta, id),
    };
}
