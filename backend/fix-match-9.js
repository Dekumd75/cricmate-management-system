const { Match } = require('./models');
const sequelize = require('./config/database');

async function fixMatch() {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');

        // Update match 9 status from completed to squad-confirmed
        const [updatedRows] = await Match.update(
            { status: 'squad-confirmed' },
            { where: { matchID: 9, status: 'completed' } }
        );

        if (updatedRows > 0) {
            console.log(`✅ Successfully updated match ID 9 - status changed to 'squad-confirmed'`);

            // Fetch and display the updated match
            const match = await Match.findByPk(9);
            console.log('\nUpdated match details:');
            console.log('- Match ID:', match.matchID);
            console.log('- Date:', match.matchDate);
            console.log('- Status:', match.status);
            console.log('- Squad IDs:', match.squadIds);
        } else {
            console.log('⚠️  No matches were updated. Match 9 might not exist or is not in completed status.');

            // Check if match exists
            const match = await Match.findByPk(9);
            if (match) {
                console.log('Match 9 current status:', match.status);
            } else {
                console.log('Match 9 does not exist in database.');
            }
        }

        await sequelize.close();
        console.log('\n✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixMatch();
