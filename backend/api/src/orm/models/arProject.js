import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

/**
 * @typedef {Object} ArProjectObject
 * @property {string} id
 * @property {boolean} published
 * @property {string} title
 * @property {string} description
 * @property {string} pictureUrl
 * @property {string} unit
 * @property {string} calibrationMessage
 * @property { "ar" | "vr" } displayMode
 * @property {string} presets
 * @property {string} userId
 */

export default sequelize.define('ArProject', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
    },
    published:{
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    title:{
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'New project',
        validate:{
            notEmpty: true,
            len:[1,255]
        }
    },
    description:{
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    },
    pictureUrl:{
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'public/common/projectCoverBlank.png',
    },
    unit:{
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Scene',
        validate:{
            notEmpty: true
        }
    },
    calibrationMessage:{
        type: DataTypes.STRING,
        allowNull: false,
        validate:{
            notEmpty: true
        }
    },
    displayMode:{
        type: DataTypes.ENUM("ar", "vr"),
        allowNull: false,
        defaultValue: "ar"
    },
    presets:{
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    },
    userId:{
        type: DataTypes.UUID,
        allowNull: false,
    },

})
