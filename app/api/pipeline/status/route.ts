/**
 * GET /api/pipeline/status
 * Returns last cron run metadata + next scheduled run.
 * Data comes from data/pipeline_status.json written by /root/run_daily_pipeline.sh
 */

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const STATUS_FILE = path.join(process.cwd(), 'data', 'pipeline_status.json')
const HEALTH_LOG  = path.join(process.cwd(), '..', '..', 'logs', 'today_health.log')

function readStatusFile(): Record<string, any> | null {
  try {
    if (!fs.existsSync(STATUS_FILE)) return null
    const raw = fs.readFileSync(STATUS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch { return null }
}

function readLastHealthCheck(): Record<string, any> | null {
  try {
    const logPath = HEALTH_LOG
    if (!fs.existsSync(logPath)) return null
    const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n').filter(Boolean)
    const last = lines[lines.length - 1]
    const spaceIdx = last.indexOf(' ')
    if (spaceIdx === -1) return null
    const ts   = last.slice(0, spaceIdx)
    const json = last.slice(spaceIdx + 1)
    const data = JSON.parse(json)
    return { timestamp: ts, summary: data.summary }
  } catch { return null }
}

function minutesAgo(isoStr: string | null): number | null {
  if (!isoStr) return null
  try {
    const ms = Date.now() - new Date(isoStr).getTime()
    return Math.round(ms / 60000)
  } catch { return null }
}

function minutesUntil(isoStr: string | null): number | null {
  if (!isoStr) return null
  try {
    const ms = new Date(isoStr).getTime() - Date.now()
    return Math.max(0, Math.round(ms / 60000))
  } catch { return null }
}

export async function GET() {
  const status = readStatusFile()
  const health = readLastHealthCheck()

  const lastRun   = status?.last_run   ?? null
  const nextRun   = status?.next_run   ?? null
  const lastError = status?.last_error ?? null
  const steps     = status?.steps      ?? {}

  const intake    = steps.intake     ?? {}
  const enrichment = steps.enrichment ?? {}
  const sweep     = steps.sweep      ?? {}

  return NextResponse.json({
    configured: true,
    schedule: '0 6 * * * (6AM ET daily)',
    last_run: lastRun,
    last_run_minutes_ago: minutesAgo(lastRun),
    last_run_end: status?.last_run_end ?? null,
    duration_ms: status?.duration_ms ?? null,
    next_run: nextRun,
    minutes_until_next_run: minutesUntil(nextRun),
    last_success: status?.success ?? null,
    exit_code: status?.exit_code ?? null,
    trigger: status?.trigger ?? 'cron',
    last_error: lastError,
    steps: {
      intake:     { created: intake.created ?? 0,     updated: intake.updated ?? 0,     errors: intake.errors ?? 0 },
      enrichment: { leads_checked: enrichment.leads_checked ?? 0, events_created: enrichment.events_created ?? 0 },
      sweep:      { leads_scanned: sweep.leads_scanned ?? 0,    tasks_created: sweep.tasks_created ?? 0 },
    },
    health_check: health,
    health_check_schedule: '0 * * * * (every hour)',
    log_path: '/root/logs/daily_pipeline.log',
    status_file: 'data/pipeline_status.json',
  })
}
