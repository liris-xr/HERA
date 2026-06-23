import ArUser from './models/arUser.js'
import ArProject from "./models/arProject.js";
import ArScene from "./models/arScene.js";

import {sequelize} from './database.js'
import "../config.js";
import { passwordHash } from "../utils/passwordHash.js";
import ArAsset from "./models/arAsset.js";
import ArMesh from "./models/arMesh.js";
import ArLabel from "./models/arLabel.js";

ArUser.hasMany(ArProject, { as: 'projects', foreignKey: 'userId', onDelete: 'CASCADE' });

ArProject.belongsTo(ArUser, { as: 'owner', foreignKey: 'userId' });
ArProject.hasMany(ArScene, { as: 'scenes', foreignKey: 'projectId', onDelete: 'CASCADE'});

ArScene.belongsTo(ArProject, { as: 'project', foreignKey: 'projectId' });
ArScene.hasMany(ArAsset, { as: 'assets', foreignKey: 'sceneId', onDelete: 'CASCADE' });
ArScene.hasMany(ArLabel, {as: 'labels', foreignKey: 'sceneId', onDelete: 'CASCADE' });
ArScene.hasMany(ArMesh, {as: 'meshes', foreignKey: 'sceneId', onDelete: 'CASCADE' });

ArAsset.belongsTo(ArScene, { as: 'scene', foreignKey: 'sceneId' });
ArMesh.belongsTo(ArScene, { as: 'scene', foreignKey: 'sceneId' });
ArLabel.belongsTo(ArScene, { as: 'scene', foreignKey: 'sceneId' });


function getBootstrapAdminConfig() {
    const email = (process.env.HERA_ADMIN_EMAIL ?? "").trim();
    const username = (process.env.HERA_ADMIN_USERNAME ?? "").trim();
    const password = process.env.HERA_ADMIN_PASSWORD ?? "";

    const missing = [];
    if (!email) missing.push("HERA_ADMIN_EMAIL");
    if (!username) missing.push("HERA_ADMIN_USERNAME");
    if (!password.trim()) missing.push("HERA_ADMIN_PASSWORD");

    if (missing.length > 0) {
        throw new Error(
            "Database has no users. Set " +
            missing.join(", ") +
            " to bootstrap the first admin account."
        );
    }

    return { email, username, password };
}

export async function bootstrapFirstAdmin() {
    const userCount = await ArUser.count();
    if (userCount > 0) return null;

    const { email, username, password } = getBootstrapAdminConfig();

    const admin = await ArUser.create({
        username,
        email,
        admin: true,
        password: passwordHash(password),
    });

    console.log(`[Database] Bootstrapped first admin user: ${email}`);
    return admin;
}

export async function initializeDatabase(options) {
    const syncResult = await sequelize.sync(options);
    await bootstrapFirstAdmin();
    return syncResult;
}

export {ArUser, ArProject, ArScene, ArAsset, ArLabel, ArMesh}
