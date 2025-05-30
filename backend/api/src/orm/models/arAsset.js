import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

/**
 * @typedef {Object} ArAssetObject
 * @property {string} id
 * @property {string} url
 * @property {Object} postion
 * @property {Object} rotation
 * @property {Object} scale
 */

export default sequelize.define('ArAsset', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
    },
    url:{
        type: DataTypes.STRING,
        allowNull: false,
        validate:{
            notEmpty: true
        }
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
    sceneId:{
        type: DataTypes.UUID,
        allowNull: false,
    }
})
