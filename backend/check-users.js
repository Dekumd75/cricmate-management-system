require('dotenv').config();
const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

(async () => {
    await sequelize.authenticate();
    const users = await sequelize.query(
        'SELECT userID, name, email, role FROM `user`',
        { type: QueryTypes.SELECT }
    );
    console.log('Users in database:');
    users.forEach(u => console.log(JSON.stringify(u)));
    process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
