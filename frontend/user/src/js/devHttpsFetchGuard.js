import { API_ORIGIN, getDevCertificateUrls } from "@/js/endpoints.js";

const NETWORK_ERROR_PATTERN = /Failed to fetch|ERR_CERT_AUTHORITY_INVALID|NetworkError|Load failed|fetch/i;
const BANNER_ID = "hera-dev-https-error";

function requestUrl(input) {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    return input?.url || "";
}

function isApiRequest(input) {
    const url = requestUrl(input);
    return !url || url.startsWith(API_ORIGIN) || url.includes(":8080");
}

function shouldShowCertificateHelp(error, input) {
    if (!import.meta.env.DEV || !isApiRequest(input)) return false;
    const message = `${error?.message || ""} ${error?.cause?.message || ""}`;
    return NETWORK_ERROR_PATTERN.test(message);
}

function addLink(list, label, href) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `${label}: ${href}`;
    item.append(link);
    list.append(item);
}

function showCertificateHelp() {
    const urls = getDevCertificateUrls();
    let banner = document.getElementById(BANNER_ID);

    if (!banner) {
        banner = document.createElement("aside");
        banner.id = BANNER_ID;
        banner.setAttribute("role", "alert");
        banner.style.cssText = [
            "position:fixed",
            "left:16px",
            "right:16px",
            "bottom:16px",
            "z-index:9999",
            "max-width:760px",
            "padding:16px",
            "border-radius:8px",
            "background:#fff7ed",
            "color:#7c2d12",
            "box-shadow:0 12px 32px rgba(15,23,42,.2)",
            "font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
        ].join(";");
        document.body.append(banner);
    }

    banner.replaceChildren();

    const title = document.createElement("strong");
    title.textContent = "HTTPS local a accepter";

    const message = document.createElement("p");
    message.textContent = "Le premier acces HTTPS local peut etre bloque par le navigateur. Ouvrez ces deux URLs, acceptez le certificat, puis rechargez HERA.";

    const list = document.createElement("ul");
    list.style.margin = "8px 0 0";
    list.style.paddingLeft = "20px";
    addLink(list, "Backend/API", urls.backend);
    addLink(list, "Frontend", urls.frontend);

    banner.append(title, message, list);
}

export function installDevHttpsFetchGuard() {
    if (!import.meta.env.DEV || window.__heraDevHttpsFetchGuardInstalled) return;

    window.__heraDevHttpsFetchGuardInstalled = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
        try {
            return await originalFetch(input, init);
        } catch (error) {
            if (shouldShowCertificateHelp(error, input)) {
                showCertificateHelp();
            }
            throw error;
        }
    };
}
