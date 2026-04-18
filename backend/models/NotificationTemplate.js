const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotificationTemplate = sequelize.define('NotificationTemplate', {
    templateID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    templateName: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    subject: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    channel: {
        type: DataTypes.STRING(30),
        allowNull: true
    }
}, {
    tableName: 'notification_template',
    timestamps: false
});

module.exports = NotificationTemplate;
