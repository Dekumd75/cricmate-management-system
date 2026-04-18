const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReportLog = sequelize.define('ReportLog', {
    reportLogID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    reportType: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    },
    generatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'user',
            key: 'userID'
        }
    }
}, {
    tableName: 'reportlog',
    timestamps: false
});

module.exports = ReportLog;
