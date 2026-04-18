const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
    notificationID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'sent'
    },
    channel: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    },
    triggeringEntityType: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    triggeringEntityID: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    userID: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    templateID: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'notification',
    timestamps: false
});

module.exports = Notification;
