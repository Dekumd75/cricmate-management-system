const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MatchStats = sequelize.define('MatchStats', {
    matchStatID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    runsScored: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    ballsFaced: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    fours: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    sixes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    wicketsTaken: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    oversBowled: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: true,
        defaultValue: 0.0
    },
    runsConceded: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    catches: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    stumping: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    wasOut: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    playerUserID: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'user',
            key: 'userID'
        }
    },
    matchID: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'matches',
            key: 'matchID'
        }
    }
}, {
    tableName: 'matchstats',
    timestamps: false
});

module.exports = MatchStats;
