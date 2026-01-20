import { DataTypes } from 'sequelize'
import { sequelizeRecords } from '../database.js'

/**
 * @property {string} id
 * @property {string} projectId
 * @property {string} sceneId
 * @property {string} userId
 * @property {string} time
 * @property {string} frame
 * @property {Object} matrix
 */

export default sequelizeRecords.define('ArRecord', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
    },
    projectId:{
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    sceneId:{
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        }
    },
    userId:{
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        }
    },
    time:{
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    frame:{
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    matrix:{
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: null,
    }
})
