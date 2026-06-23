import express from "express";
import cors from "cors";
import zip from "express-easy-zip";
import * as path from "node:path";
import { fileURLToPath } from "url";
import * as fs from "node:fs";
import * as https from "node:https";
import { Server } from "socket.io";

import { initializeDatabase } from "./src/orm/index.js";
import setupSocket from "./src/socket/index.js";
import { errorHandler } from "./src/utils/errorHandler.js";
import {
    API_PORT,
    CORS_ORIGIN,
    HTTPS_CERT_FILE,
    HTTPS_CERT_PATH,
    HTTPS_KEY_FILE,
    HTTPS_KEY_PATH,
} from "./src/config.js";

import project from "./src/routes/project.js";
import auth from "./src/routes/auth.js";
import user from "./src/routes/user.js";
import scene from "./src/routes/scene.js";
import dev from "./src/routes/dev.js";
import asset from "./src/routes/asset.js";
import label from "./src/routes/label.js";

const __filename = fileURLToPath(import.meta.url);
export const DIRNAME = path.dirname(__filename);

function readHttpsOptions() {
    try {
        return {
            key: fs.readFileSync(HTTPS_KEY_FILE),
            cert: fs.readFileSync(HTTPS_CERT_FILE),
        };
    } catch (error) {
        throw new Error(
            [
                "Unable to read HTTPS development certificates.",
                `Expected key: ${HTTPS_KEY_PATH} -> ${HTTPS_KEY_FILE}`,
                `Expected cert: ${HTTPS_CERT_PATH} -> ${HTTPS_CERT_FILE}`,
                "Run from the repository root: node scripts/setup-dev-https.mjs",
            ].join("\n"),
            { cause: error },
        );
    }
}

const corsOrigin = CORS_ORIGIN === "*"
    ? "*"
    : CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);

const app = express();
app.use(express.json());
app.use(cors({ origin: corsOrigin }));
app.use(zip());

async function main() {
    await initializeDatabase({ force: false });

    // routes FIRST
    app.use(project);
    app.use(auth);
    app.use(user);
    app.use(scene);
    app.use(dev);
    app.use(asset);
    app.use(label);

    // static
    app.use("/public", express.static("public"));

    // error handler LAST
    app.use(errorHandler);

    const httpsServer = https.createServer(readHttpsOptions(), app);

    const io = new Server(httpsServer, {
        cors: { origin: "*", methods: ["GET", "POST"] },
        path: "/api/socket",
    });
    setupSocket(io);

    httpsServer.listen(API_PORT, () => console.log(`Server started on https://localhost:${API_PORT}`));
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
