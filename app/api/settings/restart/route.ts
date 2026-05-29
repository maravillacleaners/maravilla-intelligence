/**
 * POST /api/settings/restart
 * Gracefully exits the Node.js process.
 * Docker's restart:always policy brings the container back within ~5 seconds,
 * re-reading the .env file with any newly saved API keys.
 *
 * Only call after confirming with the user — this causes ~10s of downtime.
 */

import { NextResponse } from 'next/server'

let restarting = false

export async function POST() {
  if (restarting) {
    return NextResponse.json({ ok: false, message: 'Already restarting…' })
  }
  restarting = true

  // Exit after the response is sent
  setTimeout(() => {
    console.log('[settings/restart] Graceful exit triggered by UI — Docker will restart.')
    process.exit(0)
  }, 800)

  return NextResponse.json({
    ok: true,
    message: 'Restarting now. Refresh the page in 15 seconds.',
    eta_seconds: 15,
  })
}

export async function GET() {
  return NextResponse.json({ description: 'POST /api/settings/restart — graceful process exit, triggers Docker restart' })
}
