import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

/**
 * @typedef {Object} ArTriggerObject
 * @property {string} id
 * @property {int} radius
 * @property {boolean} hideInViewer
 * @property {string} action
 * @property {Object} position
 * @property {Object} scale
 */

export default sequelize.define('ArTrigger', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
    },
    radius:{
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    hideInViewer:{
        type:DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "None",
    },
    position:{
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
