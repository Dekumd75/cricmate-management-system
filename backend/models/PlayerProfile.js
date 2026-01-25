const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlayerProfile = sequelize.define('PlayerProfile', {
    playerUserID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: 'user',
            key: 'userID'
        }
    },
    dob: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    battingStyle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bowlingStyle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    playerRole: {
        type: DataTypes.STRING,
        allowNull: true
    },
    photoURL: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'playerprofile',
    timestamps: false
});

module.exports = PlayerProfile;
