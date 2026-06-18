import { DataTypes } from 'sequelize';
import { sequelize } from '../database.js';

export default sequelize.define('ArHomeSettings', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Vos projets"
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: ""
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: ""
    },
    maxFavorites: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10
    }
});
