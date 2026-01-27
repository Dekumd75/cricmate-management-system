const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PasswordHistory = sequelize.define('PasswordHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user', // Use lowercase 'user' to match existing table name
            key: 'userID'  // Reference userID column in user table
        },
        onDelete: 'CASCADE'
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    changedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'passwordhistories',
    timestamps: true,
    indexes: [
        {
            fields: ['userID', 'changedAt']
        }
    ]
});

module.exports = PasswordHistory;
