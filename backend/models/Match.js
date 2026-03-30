const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Match = sequelize.define('Match', {
    matchID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    matchDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    matchType: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    venue: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    result: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    opponentID: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'opponent',
            key: 'opponentID'
        }
    },
    // Additional fields for squad and status management
    status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'pending' // pending, squad-confirmed, completed
    },
    squadIds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'user',
            key: 'userID'
        }
    }
}, {
    tableName: 'matches',
    timestamps: false
});

module.exports = Match;
