-- Migration: Create user export limits table for enhanced free tier tracking
-- Run this in your Turso dashboard SQL editor or with: turso db shell <database-name> < turso-migration-export-limits.sql

-- Drop table if exists (for clean slate during development)
-- DROP TABLE IF EXISTS user_export_limits;

-- Create the user export limits table
CREATE TABLE IF NOT EXISTS user_export_limits (
    user_id TEXT PRIMARY KEY,
    
    -- Daily exports that reset each day (free tier gets 2 per day)
    daily_exports_remaining INTEGER DEFAULT 2,
    
    -- One-time welcome credits for new users (10 credits that don't reset)
    welcome_credits_remaining INTEGER DEFAULT 10,
    
    -- How many turbo/fast exports the user has used (max 3 for free tier)
    turbo_exports_used INTEGER DEFAULT 0,
    
    -- The date when daily_exports_remaining was last reset
    last_daily_reset_date TEXT NOT NULL,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_export_limits_user_id ON user_export_limits(user_id);

-- View current schema
SELECT 
    name,
    sql
FROM sqlite_master
WHERE type = 'table' AND name = 'user_export_limits';

-- To verify the table was created, run:
-- SELECT * FROM user_export_limits LIMIT 1;

-- To manually add a test user (replace 'user_xxx' with actual user ID):
-- INSERT INTO user_export_limits (
--     user_id, 
--     daily_exports_remaining, 
--     welcome_credits_remaining, 
--     turbo_exports_used, 
--     last_daily_reset_date
-- ) VALUES (
--     'user_xxx', 
--     2, 
--     10, 
--     0, 
--     date('now')
-- )
-- ON CONFLICT(user_id) DO NOTHING;
