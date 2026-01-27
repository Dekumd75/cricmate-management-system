require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT,
        timezone: '+05:30', // Sri Lanka timezone (UTC+5:30)
        dialectOptions: {
            timezone: '+05:30', // For MySQL connection timezone
        }
    }
);

module.exports = sequelize;
