import {DataTypes} from 'sequelize'
import { sequelize } from '../database.js'

/**
 * @typedef {Object} ArLabelObject
 * @property {string} id
 * @property {Object} postion
 * @property {String} text
 * @property {Object} sceneId
 */

export default sequelize.define('ArLabel', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
    },

    position:{
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {x:0, y:0, z:0},
    },

    text:{
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'label',
    },

    timestampStart:{
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },

    timestampEnd:{
        type: DataTypes.INTEGER,
        defaultValue: null,
    },

    sceneId:{
        type: DataTypes.UUID,
        allowNull: false,
    }


})
