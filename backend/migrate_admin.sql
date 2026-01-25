-- Quick migration script to move admin data from Users to user table

-- Copy admin account to user table (if not already there)
INSERT INTO user (name, email, password, role, phone, createdAt, updatedAt)
SELECT name, email, password, role, phone, NOW(), NOW()
FROM Users
WHERE email = 'admin@cricmate.com'
AND NOT EXISTS (SELECT 1 FROM user WHERE user.email = 'admin@cricmate.com');

-- Drop the Users table
DROP TABLE IF EXISTS Users;

-- Also drop Players table if it was created (we'll use player instead)
DROP TABLE IF EXISTS Players;
