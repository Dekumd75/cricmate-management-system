const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoginAttempt = sequelize.define('LoginAttempt', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        index: true // Index for faster queries
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userAgent: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    attemptTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    success: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'loginattempts',
    timestamps: true, // Adds createdAt and updatedAt
    indexes: [
        {
            fields: ['email', 'attemptTime']
        }
    ]
});

module.exports = LoginAttempt;
