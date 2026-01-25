-- SQL script to clean up duplicate Users table
-- Run this in phpMyAdmin or MySQL command line

-- First, check if Users table has any data
SELECT 'Users table data:' as info;
SELECT * FROM Users;

-- If Users table has data (like your admin account), migrate it to user table
-- Uncomment and run these lines if needed:

-- INSERT INTO user (id, name, email, password, role, phone, createdAt, updatedAt)
-- SELECT id, name, email, password, role, phone, createdAt, updatedAt
-- FROM Users
-- WHERE NOT EXISTS (SELECT 1 FROM user WHERE user.email = Users.email);

-- After migrating data (or if Users is empty), drop the Users table
DROP TABLE IF EXISTS Users;

-- Verify only 'user' table remains
SHOW TABLES LIKE '%user%';

SELECT 'Migration complete! Only user table should remain.' as status;
