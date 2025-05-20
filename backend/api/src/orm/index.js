import ArUser from './models/arUser.js'
import ArProject from "./models/arProject.js";
import ArScene from "./models/arScene.js";

import {sequelize} from './database.js'
import ArAsset from "./models/arAsset.js";
import ArMesh from "./models/arMesh.js";
import ArLabel from "./models/arLabel.js";
import ArTrigger from "./models/arTrigger.js";

ArUser.hasMany(ArProject, { as: 'projects', foreignKey: 'userId', onDelete: 'CASCADE' });

ArProject.belongsTo(ArUser, { as: 'owner', foreignKey: 'userId' });
ArProject.hasMany(ArScene, { as: 'scenes', foreignKey: 'projectId', onDelete: 'CASCADE'});

ArScene.belongsTo(ArProject, { as: 'project', foreignKey: 'projectId' });
ArScene.hasMany(ArAsset, { as: 'assets', foreignKey: 'sceneId', onDelete: 'CASCADE' });
ArScene.hasMany(ArLabel, {as: 'labels', foreignKey: 'sceneId', onDelete: 'CASCADE' });
ArScene.hasMany(ArMesh, {as: 'meshes', foreignKey: 'sceneId', onDelete: 'CASCADE' });
ArScene.hasMany(ArTrigger, {as: 'triggers', foreignKey: 'sceneId', onDelete: 'CASCADE' });

ArAsset.belongsTo(ArScene, { as: 'scene', foreignKey: 'sceneId' });
ArMesh.belongsTo(ArScene, { as: 'scene', foreignKey: 'sceneId' });
ArLabel.belongsTo(ArScene, { as: 'scene', foreignKey: 'sceneId' });
ArTrigger.belongsTo(ArScene, { as: 'scene', foreignKey: 'sceneId' });

export async function initializeDatabase (options) {
    return await sequelize.sync(options);
}

export {ArUser, ArProject, ArScene, ArAsset, ArLabel, ArMesh, ArTrigger}
