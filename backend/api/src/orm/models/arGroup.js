import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

/**
 * @typedef {Object} ArGroupObject
 * @property {string} id
 * @property {Object} position
 * @property {Object} rotation
 * @property {Object} scale
 * @property {}
 */

export default sequelize.define('ArGroup', {
    id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
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
    },
})
