const User = require('./User');
const AuditLog = require('./AuditLog');
const PlayerProfile = require('./PlayerProfile');
const InviteCode = require('./InviteCode');
const PasswordReset = require('./PasswordReset');
const LoginAttempt = require('./LoginAttempt');
const PasswordHistory = require('./PasswordHistory');

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

// PlayerProfile associations
User.hasOne(PlayerProfile, {
    foreignKey: 'playerUserID',
    sourceKey: 'id',
    as: 'playerProfile'
});
PlayerProfile.belongsTo(User, {
    foreignKey: 'playerUserID',
    targetKey: 'id',
    as: 'player'
});

// InviteCode associations
User.hasMany(InviteCode, {
    foreignKey: 'playerUserID',
    sourceKey: 'id',
    as: 'inviteCodes'
});
InviteCode.belongsTo(User, {
    foreignKey: 'playerUserID',
    targetKey: 'id',
    as: 'player'
});

// PasswordHistory associations
User.hasMany(PasswordHistory, {
    foreignKey: 'userID',
    sourceKey: 'id',
    as: 'passwordHistories'
});
PasswordHistory.belongsTo(User, {
    foreignKey: 'userID',
    targetKey: 'id',
    as: 'user'
});

// Export all models
module.exports = {
    User,
    AuditLog,
    PlayerProfile,
    InviteCode,
    PasswordReset,
    LoginAttempt,
    PasswordHistory
};
