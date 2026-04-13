-- Migration for Proxidex pricing tiers update
-- Run with: turso db shell <dbname> < scripts/turso-migration.sql

-- 1. Add founding_number column to subscriptions table
ALTER TABLE subscriptions ADD COLUMN founding_number INTEGER;

-- 2. Add stripe_payment_intent_id for one-time payments
ALTER TABLE subscriptions ADD COLUMN stripe_payment_intent_id TEXT;

-- 3. Create user_export_limits table for free tier tracking
CREATE TABLE IF NOT EXISTS user_export_limits (
  user_id TEXT PRIMARY KEY,
  welcome_credits_used INTEGER DEFAULT 0,  -- Tracks how many of welcome export credits used
  turbo_exports_used INTEGER DEFAULT 0,    -- Tracks how many of 3 turbo trials used
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_export_limits_user ON user_export_limits(user_id);

-- Note: The existing user_exports table continues to track daily export counts
-- Vercel cron job continues to clean it based on EXPORT_RETENTION_DAYS (default 365 days)

-- Pricing tiers in subscriptions.tier:
-- 'free' - Trainer (2 daily + 5 welcome + 3 turbo)
-- 'annual' - Gym Leader Season Pass ($19/yr)
-- 'lifetime' - Champion ($49 one-time)
-- 'founding_alpha' - First 100 ($29)
-- 'founding_beta' - Next 150 ($35)
-- 'founding_gamma' - Next 250 ($39)
