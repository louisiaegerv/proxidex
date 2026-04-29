-- Migration: Create user_trophies table for Trophy Case feature
-- Run this in your Turso dashboard SQL editor or with: turso db shell <database-name> < turso-migration-trophies.sql

-- Drop table if exists (for clean slate during development)
-- DROP TABLE IF EXISTS user_trophies;

-- Create the user trophies table
-- Tracks which collectible metal cards each user has unlocked
CREATE TABLE IF NOT EXISTS user_trophies (
    user_id TEXT NOT NULL,
    trophy_id TEXT NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Optional: track progress toward unlock (e.g., 7/10 decks)
    progress INTEGER DEFAULT 0,
    progress_target INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, trophy_id)
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_user_trophies_user_id ON user_trophies(user_id);

-- Index for faster lookups by trophy
CREATE INDEX IF NOT EXISTS idx_user_trophies_trophy_id ON user_trophies(trophy_id);

-- View current schema
SELECT 
    name,
    sql
FROM sqlite_master
WHERE type = 'table' AND name = 'user_trophies';

-- Trophy IDs reference (stored in code, not DB):
-- 
-- TIER TROPHIES (auto-unlocked on subscription purchase):
--   founding_alpha   -> Founding Trainer Alpha metal card
--   founding_beta    -> Founding Trainer Beta metal card
--   founding_gamma   -> Founding Trainer Gamma metal card
--   annual           -> Gym Leader metal card
--   lifetime         -> Champion metal card
--
-- ACHIEVEMENT TROPHIES (unlocked through app usage):
--   first_deck       -> Create your first deck
--   first_export     -> Export your first print file
--   limitless_import -> Import a deck from Limitless TCG
--   deck_collector   -> Save 5 decks
--   export_veteran   -> Export 10 print files
--   search_pro       -> Search 50 cards
--   meta_chaser      -> Import 3 meta decks
--   print_master     -> Use all print settings
--   master_collector -> Unlock all other trophies

-- To manually grant a trophy for testing:
-- INSERT INTO user_trophies (user_id, trophy_id, progress, progress_target) 
-- VALUES ('user_xxx', 'first_deck', 1, 1)
-- ON CONFLICT(user_id, trophy_id) DO NOTHING;
