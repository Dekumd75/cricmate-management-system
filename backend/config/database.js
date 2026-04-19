require('dotenv').config();
const { Sequelize } = require('sequelize');

const useSSL = process.env.DB_SSL === 'true';

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: false,
        timezone: '+05:30',
        dialectOptions: {
            timezone: '+05:30',
            ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {})
        }
    }
);

module.exports = sequelize;
