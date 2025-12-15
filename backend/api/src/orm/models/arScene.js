import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

/**
 * @typedef {Object} ArSceneObject
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} envmapUrl
 * @property {json} vrStartPosition
 * @property {string} projectId
 */

export default sequelize.define('ArScene', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
    },

    title:{
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'New scene',
        validate:{
            notEmpty: true
        }
    },

    description:{
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    },

    index:{
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    envmapUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },

    vrStartPosition: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {position: {x: 0, y: 1.7, z: 0}, rotation: {x: 0, y: 0, z: 0}}
    },

    projectId:{
        type: DataTypes.UUID,
        allowNull: false,
    },
})
