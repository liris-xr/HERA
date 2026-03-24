import { DataTypes } from 'sequelize';
import { sequelize } from '../database.js';

/**
 * @property {number} id
 * @property {number} recordTimerMs
 * @property {number} sendRecordsTimerMs
 */

export default sequelize.define('ArAnalyticsConfig', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    recordTimerMs: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2000,
    },
    sendRecordsTimerMs: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30000,
    }
});
