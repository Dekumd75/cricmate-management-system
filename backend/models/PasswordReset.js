const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PasswordReset = sequelize.define('PasswordReset', {
    resetID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user',
            key: 'userID'
        }
    },
    resetToken: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    isUsed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'passwordreset',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false
});

module.exports = PasswordReset;
