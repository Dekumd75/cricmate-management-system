const User = require('./User');
const AuditLog = require('./AuditLog');
const PlayerProfile = require('./PlayerProfile');
const InviteCode = require('./InviteCode');
const PasswordReset = require('./PasswordReset');

// Define associations
// Note: AuditLog.userID maps to 'performedBy' column in DB
// User.id maps to 'userID' column in DB
AuditLog.belongsTo(User, {
    foreignKey: 'userID',  // This is the Sequelize property name in AuditLog
    targetKey: 'id',       // This is the Sequelize property name in User
    as: 'user'
});
User.hasMany(AuditLog, {
    foreignKey: 'userID',  // This is the Sequelize property name in AuditLog
    sourceKey: 'id'        // This is the Sequelize property name in User
});

// Export all models
module.exports = {
    User,
    AuditLog,
    PlayerProfile,
    InviteCode,
    PasswordReset
};
