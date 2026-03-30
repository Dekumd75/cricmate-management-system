// cleanup-data.js
// Deletes all data EXCEPT the admin user (admin@cricmate.com)

require('dotenv').config();
const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

async function run(sql) {
    await sequelize.query(sql, { type: QueryTypes.RAW });
    console.log('  OK: ' + sql.substring(0, 60));
}

async function cleanupData() {
    await sequelize.authenticate();
    console.log('Connected to cricmate database\n');

    await run('SET FOREIGN_KEY_CHECKS = 0');

    await run('DELETE FROM `matchstats`');
    await run('DELETE FROM `attendance_record`');
    await run('DELETE FROM `auditlog`');
    await run('DELETE FROM `invitecode`');
    await run('DELETE FROM `passwordreset`');
    await run('DELETE FROM `loginattempts`');
    await run('DELETE FROM `passwordhistories`');
    await run('DELETE FROM `session`');
    await run('DELETE FROM `playerprofile`');
    await run('DELETE FROM `matches`');
    await run('DELETE FROM `opponent`');
    await run('DELETE FROM `playergroup`');
    await run("DELETE FROM `user` WHERE email != 'admin@cricmate.com'");

    await run('SET FOREIGN_KEY_CHECKS = 1');

    // Verify admin
    const rows = await sequelize.query(
        "SELECT userID, name, email, role FROM `user` WHERE email = 'admin@cricmate.com'",
        { type: QueryTypes.SELECT }
    );

    console.log('\n--- Admin user still present: ---');
    console.log(JSON.stringify(rows[0], null, 2));
    console.log('\nDatabase cleanup complete!');
    process.exit(0);
}

cleanupData().catch(err => {
    console.log('\nERROR: ' + err.message);
    process.exit(1);
});
