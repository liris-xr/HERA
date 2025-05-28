import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

/**
 * @typedef {Object} ArSoundObject
 * @property {string} id
 * @property {string} name
 * @property {Object} url
 * @property {Object} playOnStartup
 * @property {Object} isLoopingEnabled
 */

export default sequelize.define('ArSound', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
    },
    name:{
        type: DataTypes.STRING,
        allowNull: false,
        validate:{
            notEmpty: true
        }
    },
    url:{
        type: DataTypes.STRING,
        allowNull: false,
        validate:{
            notEmpty: true
        }
    },
    playOnStartup:{
      type:DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    isLoopingEnabled:{
        type:DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    sceneId:{
        type: DataTypes.UUID,
        allowNull: false,
    }
})
