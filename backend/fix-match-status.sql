-- Fix match that was incorrectly marked as completed
-- This script updates match ID 9 to set status back to 'squad-confirmed'
-- so the user can continue entering player stats

UPDATE matches 
SET status = 'squad-confirmed' 
WHERE matchID = 9 AND status = 'completed';

-- Verify the update
SELECT matchID, matchDate, opponent, status, squadIds 
FROM matches 
WHERE matchID = 9;
