import {Sequelize} from "sequelize";

const databasePath = 'src/database/database.sqlite';

export const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: databasePath,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    logging: false,
});

const databaseRecordsPath = 'src/database/databaseRecords.sqlite.sqlite';

export const sequelizeRecords = new Sequelize({
    dialect: 'sqlite',
    storage: databaseRecordsPath,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    logging: false,
});

