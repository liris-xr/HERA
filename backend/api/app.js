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

import project from "./src/routes/project.js";
import auth from "./src/routes/auth.js";
import user from "./src/routes/user.js";
import scene from "./src/routes/scene.js";
import dev from "./src/routes/dev.js";
import asset from "./src/routes/asset.js";
import label from "./src/routes/label.js";

const __filename = fileURLToPath(import.meta.url);
export const DIRNAME = path.dirname(__filename);

const options = {
    key: fs.readFileSync(path.join(DIRNAME, "..", "..", "certs", "dev-key.pem")),
    cert: fs.readFileSync(path.join(DIRNAME, "..", "..", "certs", "dev.pem")),
};

const app = express();
app.use(express.json());
app.use(cors({}));
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

    const httpsServer = https.createServer(options, app);

    const io = new Server(httpsServer, {
        cors: { origin: "*", methods: ["GET", "POST"] },
        path: "/api/socket",
    });
    setupSocket(io);

    httpsServer.listen(8080, () => console.log("Server started on port 8080"));
}

main().catch((e) => console.error(e));