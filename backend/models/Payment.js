const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
    paymentID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amountPaid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    paymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    paymentMethod: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    gatewayTransactionID: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'completed'
    },
    feeID: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    paidBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'payment',
    timestamps: false
});

module.exports = Payment;
