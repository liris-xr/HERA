import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

/**
 * @typedef {Object} ArSceneObject
 * @property {string} id
 * @property {string} title
 * @property {string} description
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

    projectId:{
        type: DataTypes.UUID,
        allowNull: false,
    }
})
