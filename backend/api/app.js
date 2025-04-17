import express from 'express';
import {initializeDatabase} from "./src/orm/index.js";
import {resetDatabase} from "./src/orm/defaults/reset.js";
import {insertDefaults} from "./src/orm/defaults/insertDefaults.js";
import project from "./src/routes/project.js";
import auth from "./src/routes/auth.js";
import user from "./src/routes/user.js";
import scene from "./src/routes/scene.js";
import dev from "./src/routes/dev.js";
import cors from 'cors'



import * as path from "node:path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
export const DIRNAME = path.dirname(__filename);




//for https only :
import * as fs from "node:fs";
import * as https from "node:https";
const options = {
    key: fs.readFileSync('privatekey.key'),
    cert: fs.readFileSync('certificate.crt')
};


const app = express()
app.use(express.json())
app.use(cors({}))

async function main () {
    await initializeDatabase({force: false});
       // await resetDatabase();
       // await insertDefaults();

    app.use(project);
    app.use(auth);
    app.use(user);
    app.use(scene)
    app.use(dev)
    app.use('/public', express.static('public'));       //serving static files

    https.createServer(options, app).listen(8080, () => {
        console.log('Server started on port 8080')
    })
}

main().catch(e => console.error(e))
