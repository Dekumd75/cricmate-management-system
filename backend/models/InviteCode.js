const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InviteCode = sequelize.define('InviteCode', {
    codeID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    codeValue: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isUsed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    playerUserID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'playerUserID',
        references: {
            model: 'playerprofile',
            key: 'playerUserID'
        }
    }
}, {
    tableName: 'invitecode',
    timestamps: false
});

module.exports = InviteCode;
