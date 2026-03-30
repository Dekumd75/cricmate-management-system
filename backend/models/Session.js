const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Session = sequelize.define('Session', {
    sessionID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'sessionID'
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    sessionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    startTime: {
        type: DataTypes.TIME,
        allowNull: false
    },
    endTime: {
        type: DataTypes.TIME,
        allowNull: true
    },
    coachID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user',
            key: 'id'
        }
    },
    groupID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'playergroup',
            key: 'groupID'
        }
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active'
    }
}, {
    tableName: 'session',
    timestamps: false
});

module.exports = Session;
