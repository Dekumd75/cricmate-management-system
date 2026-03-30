const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AttendanceRecord = sequelize.define('AttendanceRecord', {
    recordID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    checkInTime: {
        type: DataTypes.TIME,
        allowNull: true
    },
    checkOutTime: {
        type: DataTypes.TIME,
        allowNull: true
    },
    playerUserID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user',
            key: 'userID'
        }
    },
    sessionID: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    markedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'user',
            key: 'userID'
        }
    },
    // Add date field for easier querying
    attendanceDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: 'attendance_record',
    timestamps: false
});

module.exports = AttendanceRecord;
