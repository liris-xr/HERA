import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

/**
 * @typedef {Object} ArMeshObject
 * @property {string} id
 * @property {Object} position
 * @property {Object} rotation
 * @property {Object} scale
 * @property {}
 */

export default sequelize.define('ArMesh', {
    id: {
        type: DataTypes.STRING,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
    },
    name:{
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    hideInViewer:{
      type:DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    position:{
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {x:0, y:0, z:0},
    },
    rotation:{
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {x:0, y:0, z:0},
    },
    scale:{
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {x:1, y:1, z:1},
    },
    color:{
        type:DataTypes.JSON,
        allowNull: false,
        defaultValue: {r:1, g:1, b:1},
    },
    emissiveIntensity:{
        type:DataTypes.FLOAT,
        allowNull:false,
        defaultValue:1
    },
    emissive:{
        type:DataTypes.JSON,
        allowNull: false,
        defaultValue: {r:1, g:1, b:1},
    },
    roughness:{
        type:DataTypes.FLOAT,
        allowNull:false,
        defaultValue:0.5
    },
    metalness:{
        type:DataTypes.FLOAT,
        allowNull:false,
        defaultValue:0.5
    },
    opacity:{
        type:DataTypes.FLOAT,
        allowNull:false,
        defaultValue:1
    },
    sceneId:{
        type: DataTypes.UUID,
        allowNull: false,
    },
    assetId:{
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
    }
})
