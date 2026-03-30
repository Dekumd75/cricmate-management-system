const User = require('./User');
const AuditLog = require('./AuditLog');
const PlayerProfile = require('./PlayerProfile');
const InviteCode = require('./InviteCode');
const PasswordReset = require('./PasswordReset');
const LoginAttempt = require('./LoginAttempt');
const PasswordHistory = require('./PasswordHistory');
const Match = require('./Match');
const MatchStats = require('./MatchStats');
const Opponent = require('./Opponent');
const AttendanceRecord = require('./AttendanceRecord');
const Session = require('./Session');
const PlayerGroup = require('./PlayerGroup');

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

// Match associations
Match.belongsTo(Opponent, {
    foreignKey: 'opponentID',
    targetKey: 'opponentID',
    as: 'opponent'
});
Opponent.hasMany(Match, {
    foreignKey: 'opponentID',
    sourceKey: 'opponentID',
    as: 'matches'
});

Match.belongsTo(User, {
    foreignKey: 'createdBy',
    targetKey: 'id',
    as: 'creator'
});
User.hasMany(Match, {
    foreignKey: 'createdBy',
    sourceKey: 'id',
    as: 'createdMatches'
});

// MatchStats associations
Match.hasMany(MatchStats, {
    foreignKey: 'matchID',
    sourceKey: 'matchID',
    as: 'stats'
});
MatchStats.belongsTo(Match, {
    foreignKey: 'matchID',
    targetKey: 'matchID',
    as: 'match'
});

User.hasMany(MatchStats, {
    foreignKey: 'playerUserID',
    sourceKey: 'id',
    as: 'matchStats'
});
MatchStats.belongsTo(User, {
    foreignKey: 'playerUserID',
    targetKey: 'id',
    as: 'player'
});

// AttendanceRecord associations
User.hasMany(AttendanceRecord, {
    foreignKey: 'playerUserID',
    sourceKey: 'id',
    as: 'attendanceRecords'
});
AttendanceRecord.belongsTo(User, {
    foreignKey: 'playerUserID',
    targetKey: 'id',
    as: 'player'
});

AttendanceRecord.belongsTo(User, {
    foreignKey: 'markedBy',
    targetKey: 'id',
    as: 'marker'
});
User.hasMany(AttendanceRecord, {
    foreignKey: 'markedBy',
    sourceKey: 'id',
    as: 'markedAttendance'
});

// Session associations
Session.belongsTo(User, {
    foreignKey: 'coachID',
    targetKey: 'id',
    as: 'coach'
});
User.hasMany(Session, {
    foreignKey: 'coachID',
    sourceKey: 'id',
    as: 'sessions'
});

Session.belongsTo(PlayerGroup, {
    foreignKey: 'groupID',
    targetKey: 'groupID',
    as: 'group'
});
PlayerGroup.hasMany(Session, {
    foreignKey: 'groupID',
    sourceKey: 'groupID',
    as: 'sessions'
});

// AttendanceRecord to Session association
AttendanceRecord.belongsTo(Session, {
    foreignKey: 'sessionID',
    targetKey: 'sessionID',
    as: 'session'
});
Session.hasMany(AttendanceRecord, {
    foreignKey: 'sessionID',
    sourceKey: 'sessionID',
    as: 'attendanceRecords'
});

// Export all models
module.exports = {
    User,
    AuditLog,
    PlayerProfile,
    InviteCode,
    PasswordReset,
    LoginAttempt,
    PasswordHistory,
    Match,
    MatchStats,
    Opponent,
    AttendanceRecord,
    Session,
    PlayerGroup
};
