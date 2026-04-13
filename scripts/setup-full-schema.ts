/**
 * Complete database schema setup for Proxidex
 * Run: npx tsx scripts/setup-full-schema.ts
 */

import { getClient } from "@/lib/db"

async function main() {
  console.log("Setting up Proxidex database schema...\n")
  
  const db = getClient()
  
  // 1. User exports (daily export tracking for analytics)
  console.log("1. Creating user_exports table (analytics)...")
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS user_exports (
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, date)
      )
    `,
    args: []
  })
  await db.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_exports_user_date ON user_exports(user_id, date)`,
    args: []
  })
  console.log("   ✅ user_exports table ready\n")
  
  // 2. User export limits (welcome credits & turbo trials for free users)
  console.log("2. Creating user_export_limits table (free tier limits)...")
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS user_export_limits (
        user_id TEXT PRIMARY KEY,
        welcome_credits_used INTEGER DEFAULT 0,
        turbo_exports_used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    args: []
  })
  await db.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_export_limits_user ON user_export_limits(user_id)`,
    args: []
  })
  console.log("   ✅ user_export_limits table ready")
  console.log(`      - Welcome credits: 5 (one-time, tracked as used)`)
  console.log(`      - Turbo trials: 3 (tracked as used)\n`)
  
  // 3. Subscriptions (Annual Season Pass, Lifetime Champion, Founding Trainers)
  console.log("3. Creating subscriptions table...")
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS subscriptions (
        user_id TEXT PRIMARY KEY,
        tier TEXT DEFAULT 'free',   -- 'free', 'annual', 'lifetime', 'founding_alpha', 'founding_beta', 'founding_gamma'
        status TEXT DEFAULT 'active', -- 'active', 'expired', 'cancelled'
        started_at DATETIME,
        expires_at DATETIME,        -- Only for annual subscriptions
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        stripe_payment_intent_id TEXT, -- For lifetime/founding one-time payments
        founding_number INTEGER,    -- e.g., 29 for "Founding Trainer Alpha #29"
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    args: []
  })
  console.log("   ✅ subscriptions table ready")
  console.log("      Tiers:")
  console.log("      - free: Trainer (2 daily exports, 5 welcome, 3 turbo)")
  console.log("      - annual: Gym Leader Season Pass ($19/yr)")
  console.log("      - lifetime: Champion ($49 one-time)")
  console.log("      - founding_alpha: First 100 ($29)")
  console.log("      - founding_beta: Next 150 ($35)")
  console.log("      - founding_gamma: Next 250 ($39)\n")
  
  // 4. User profiles (cloud settings storage)
  console.log("4. Creating user_profiles table...")
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        settings JSON,              -- Print settings
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    args: []
  })
  console.log("   ✅ user_profiles table ready\n")
  
  // 5. Decks (cloud deck storage - Pro only)
  console.log("5. Creating decks table...")
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS decks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        items JSON NOT NULL,        -- Array of deck items
        is_active BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    args: []
  })
  await db.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id)`,
    args: []
  })
  console.log("   ✅ decks table ready\n")
  
  // 6. Print profiles (saved settings presets)
  console.log("6. Creating print_profiles table...")
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS print_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        settings JSON NOT NULL,
        is_default BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    args: []
  })
  await db.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_print_profiles_user_id ON print_profiles(user_id)`,
    args: []
  })
  console.log("   ✅ print_profiles table ready\n")
  
  // 7. Cards table (should already exist, but ensure index exists)
  console.log("7. Ensuring cards indexes exist...")
  await db.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_set_local ON cards (set_code, local_id)`,
    args: []
  })
  await db.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_set_code ON cards (set_code)`,
    args: []
  })
  console.log("   ✅ cards indexes verified\n")
  
  console.log("✅ All tables created successfully!")
  console.log("\n📊 Schema Summary:")
  console.log("  ├── cards (card database)")
  console.log("  ├── user_exports (daily export analytics)")
  console.log("  ├── user_export_limits (free tier: welcome credits + turbo trials)")
  console.log("  ├── subscriptions (pricing tiers)")
  console.log("  ├── user_profiles (cloud settings)")
  console.log("  ├── decks (cloud deck storage - Pro only)")
  console.log("  └── print_profiles (saved print settings)")
  console.log("\n💰 Pricing Tiers:")
  console.log("  🆓 Free (Trainer): 2/day + 5 welcome + 3 turbo")
  console.log("  💙 Annual (Gym Leader): $19/yr - Unlimited")
  console.log("  👑 Lifetime (Champion): $49 - Unlimited forever")
  console.log("  🏆 Founding Trainer α: $29 (100 spots)")
  console.log("  🥈 Founding Trainer β: $35 (150 spots)")
  console.log("  🥉 Founding Trainer γ: $39 (250 spots)")
}

main().catch(console.error)
