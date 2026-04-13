/**
 * Setup script to create the user_exports table and user_export_limits table
 * Run: npx tsx scripts/setup-exports-table.ts
 */

import { createAllExportTables } from "@/lib/exports"

async function main() {
  console.log("Creating export tables...")
  
  try {
    await createAllExportTables()
    console.log("✅ user_exports table created successfully (backward compatibility)")
    console.log("✅ user_export_limits table created successfully (new enhanced limits)")
  } catch (error) {
    console.error("❌ Failed to create tables:", error)
    process.exit(1)
  }
}

main()
