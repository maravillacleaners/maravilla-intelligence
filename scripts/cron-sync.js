/**
 * Cron Sync Script — Runs every 15 minutes to sync opportunities and intelligence from USASpending
 * Usage: node scripts/cron-sync.js
 * Deploy: Add to VPS crontab with:
 *   (asterisk)/15 (asterisk) (asterisk) (asterisk) (asterisk) cd /app && node scripts/cron-sync.js >> logs/cron-sync.log 2>&1
 */

const fs = require('fs')
const path = require('path')

const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
const LOG_PATH = path.join(process.cwd(), 'data', 'sync-runs.json')
const DATA_DIR = path.dirname(LOG_PATH)

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Load existing runs
let syncRuns = []
try {
  if (fs.existsSync(LOG_PATH)) {
    const content = fs.readFileSync(LOG_PATH, 'utf8')
    syncRuns = JSON.parse(content).runs || []
  }
} catch (e) {
  console.error('Error loading sync runs:', e.message)
}

// Helper: Call API endpoint
async function callSync(endpoint, name) {
  const startTime = Date.now()
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      timeout: 30000,
    })
    const data = await response.json()
    const duration = Date.now() - startTime

    const result = {
      timestamp: new Date().toISOString(),
      name,
      endpoint,
      success: response.ok,
      status: response.status,
      synced: data.synced || 0,
      skipped: data.skipped || 0,
      total_fetched: data.total_fetched || 0,
      errors: data.errors || [],
      duration_ms: duration,
    }

    console.log(`✓ ${name}: ${result.synced} synced, ${result.skipped} skipped (${duration}ms)`)
    return result
  } catch (e) {
    const duration = Date.now() - startTime
    const result = {
      timestamp: new Date().toISOString(),
      name,
      endpoint,
      success: false,
      error: e.message,
      duration_ms: duration,
    }
    console.error(`✗ ${name} failed: ${e.message} (${duration}ms)`)
    return result
  }
}

// Main execution
async function main() {
  console.log(`[${new Date().toISOString()}] Starting cron sync...`)

  try {
    // Sync opportunities (default 2 pages, 90 days)
    const oppResult = await callSync('/api/sync/opportunities?pages=2&days=90', 'opportunities')
    syncRuns.unshift(oppResult)

    // Sync intelligence/national data (default 1 page)
    const intlResult = await callSync('/api/sync/national?pages=1', 'intelligence')
    syncRuns.unshift(intlResult)

    // Keep only last 100 runs
    syncRuns = syncRuns.slice(0, 100)

    // Write back
    fs.writeFileSync(LOG_PATH, JSON.stringify({ runs: syncRuns }, null, 2))
    console.log(`[${new Date().toISOString()}] Cron sync complete. Runs recorded: ${syncRuns.length}`)
  } catch (e) {
    console.error('Fatal error in cron sync:', e)
    process.exit(1)
  }
}

main()
