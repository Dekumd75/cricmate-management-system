const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Fee = sequelize.define('Fee', {
    feeID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    playerUserID: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    month: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    amountDue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'pending'
    }
}, {
    tableName: 'fee',
    timestamps: false
});

module.exports = Fee;
