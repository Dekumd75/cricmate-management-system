const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'userID' // Map to existing userID column
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'passwordHash' // Map to existing passwordHash column
    },
    role: {
        type: DataTypes.ENUM('admin', 'coach', 'player', 'parent'),
        allowNull: false,
        defaultValue: 'parent'
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'contactNumber' // Map to existing contactNumber column
    },
    accountStatus: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'active'
    }
}, {
    tableName: 'user', // Use existing lowercase table name
    timestamps: false, // Existing table doesn't have createdAt/updatedAt columns
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

// Method to compare password
User.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
