import fs from 'fs'
import path from 'path'

export interface SyncEntry {
  timestamp: string
  records_created: number
  records_updated: number
  errors: number
  error_messages: string[]
  duration_ms: number
  metadata?: Record<string, any>
}

export interface IntegrationLog {
  [integration: string]: SyncEntry[]
}

const DATA_DIR = path.join(process.cwd(), 'data')
const LOG_FILE = path.join(DATA_DIR, 'sync-log.json')
const MAX_ENTRIES = 10

function ensureDataDir(): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  } catch {}
}

function readLogFile(): IntegrationLog {
  try {
    const raw = fs.readFileSync(LOG_FILE, 'utf-8')
    return JSON.parse(raw) as IntegrationLog
  } catch {
    return {}
  }
}

function writeLogFile(log: IntegrationLog): void {
  try {
    ensureDataDir()
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8')
  } catch {}
}

export function writeSyncLog(
  integration: string,
  entry: Omit<SyncEntry, 'timestamp'>
): void {
  const log = readLogFile()
  const fullEntry: SyncEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }
  if (!Array.isArray(log[integration])) {
    log[integration] = []
  }
  log[integration].unshift(fullEntry)
  if (log[integration].length > MAX_ENTRIES) {
    log[integration] = log[integration].slice(0, MAX_ENTRIES)
  }
  writeLogFile(log)
}

export function readLastSync(integration: string): SyncEntry | null {
  const log = readLogFile()
  const entries = log[integration]
  if (!Array.isArray(entries) || entries.length === 0) return null
  return entries[0]
}

export function readAllSyncLogs(): Record<string, SyncEntry | null> {
  const log = readLogFile()
  const result: Record<string, SyncEntry | null> = {}
  for (const key of Object.keys(log)) {
    const entries = log[key]
    result[key] = Array.isArray(entries) && entries.length > 0 ? entries[0] : null
  }
  return result
}
