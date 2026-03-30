const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Opponent = sequelize.define('Opponent', {
    opponentID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    opponentName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    contactInfo: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'opponent',
    timestamps: false
});

module.exports = Opponent;
