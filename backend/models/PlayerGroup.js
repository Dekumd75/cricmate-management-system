const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlayerGroup = sequelize.define('PlayerGroup', {
    groupID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    groupName: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    location: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'playergroup',
    timestamps: false
});

module.exports = PlayerGroup;
