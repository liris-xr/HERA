import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

/**
 * @typedef {Object} ArActionObject
 * @property {string} id
 * @property {string} event
 * @property {string} targetSceneId
 * @property {string} targetAssetId
 * @property {Object} parameters
 * @property {string} presetId
 */

export default sequelize.define('ArAction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    event: {
        type: DataTypes.STRING,
        allowNull: false
    },
    targetSceneId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    targetAssetId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    parameters: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
    },
    presetId: {
        type: DataTypes.UUID,
        allowNull: false
    }
})
