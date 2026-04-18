const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
    messageID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    senderID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user',
            key: 'userID'
        }
    },
    receiverID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user',
            key: 'userID'
        }
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'messages',
    timestamps: false
});

module.exports = Message;
