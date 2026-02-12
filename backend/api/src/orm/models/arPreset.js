import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

/**
 * @typedef {Object} ArPresetObject
 * @property {string} id
 * @property {string} bigText
 * @property {string} icon
 * @property {string} text
 * @property {string} projectId
 */

export default sequelize.define('ArPreset', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    bigText: {
        type: DataTypes.STRING,
        allowNull: true
    },
    icon: {
        type: DataTypes.STRING,
        allowNull: true
    },
    text: {
        type: DataTypes.STRING,
        allowNull: true
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: false
    }
})
