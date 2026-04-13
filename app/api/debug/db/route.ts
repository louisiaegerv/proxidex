import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Dynamic imports for Node.js modules
function loadFs() {
  if (typeof window === 'undefined') {
    return require('fs')
  }
  return null
}

function loadPath() {
  if (typeof window === 'undefined') {
    return require('path')
  }
  return null
}

export async function GET() {
  const { userId } = await auth()
  
  const fs = loadFs()
  const path = loadPath()
  
  if (!fs || !path) {
    return NextResponse.json({ error: "Server-side only" }, { status: 500 })
  }
  
  const dbPath = path.join(process.cwd(), 'cards.db')
  
  // Check if file exists
  const exists = fs.existsSync(dbPath)
  const stats = exists ? fs.statSync(dbPath) : null
  
  return NextResponse.json({
    userId,
    dbPath,
    dbExists: exists,
    dbSize: stats ? stats.size : 0,
    dbModified: stats ? stats.mtime : null,
    env: {
      TURSO_URL: process.env.TURSO_DATABASE_URL ? 'SET' : 'NOT SET',
      TURSO_TOKEN: process.env.TURSO_AUTH_TOKEN ? 'SET' : 'NOT SET',
    }
  })
}
