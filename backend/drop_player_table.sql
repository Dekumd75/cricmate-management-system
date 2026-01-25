-- Clean up the player table created by Sequelize
DROP TABLE IF EXISTS player;

-- Confirm only user table remains (plus PlayerProfile and other existing tables)
SHOW TABLES;
