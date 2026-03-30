require('dotenv').config();
const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

(async () => {
    await sequelize.authenticate();
    const tables = [
        'user', 'matchstats', 'attendance_record', 'auditlog',
        'invitecode', 'passwordreset', 'loginattempts', 'passwordhistories',
        'session', 'playerprofile', 'matches', 'opponent', 'playergroup'
    ];
    console.log('\nTable row counts after cleanup:\n');
    for (const t of tables) {
        const rows = await sequelize.query('SELECT COUNT(*) as cnt FROM `' + t + '`', { type: QueryTypes.SELECT });
        console.log('  ' + t.padEnd(25) + rows[0].cnt + ' row(s)');
    }
    console.log('');
    process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
