/**
 * SAM Discovery Agent Scheduler
 *
 * Schedules the SAM.gov discovery agent to run every 6 hours
 * Can be integrated with:
 * - Node cron
 * - AWS Lambda with EventBridge
 * - GitHub Actions
 * - n8n workflows
 *
 * Cron expression: 0 (slash) 6 * * * (every 6 hours: 00:00, 06:00, 12:00, 18:00 UTC)
 */

import { runSAMDiscoveryAgent } from './sam-discovery-agent'

interface SchedulerConfig {
  interval: number // milliseconds
  daysBack: number // how many days to look back for new opportunities
  maxRetries: number
  retryDelay: number // milliseconds
  enabled: boolean
}

export class SAMDiscoveryScheduler {
  private config: SchedulerConfig
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      interval: 6 * 60 * 60 * 1000, // 6 hours default
      daysBack: 7,
      maxRetries: 3,
      retryDelay: 5000,
      enabled: true,
      ...config,
    }
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('[SAM Scheduler] Scheduler is disabled')
      return
    }

    if (this.intervalId !== null) {
      console.warn('[SAM Scheduler] Scheduler already running')
      return
    }

    console.log(
      `[SAM Scheduler] Starting SAM discovery scheduler (interval: ${this.config.interval}ms, daysBack: ${this.config.daysBack})`
    )

    // Run immediately on start
    this.executeWithRetry().catch((error) => {
      console.error('[SAM Scheduler] Initial run failed:', error)
    })

    // Set up recurring schedule
    this.intervalId = setInterval(() => {
      this.executeWithRetry().catch((error) => {
        console.error('[SAM Scheduler] Scheduled run failed:', error)
      })
    }, this.config.interval)
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId === null) {
      console.warn('[SAM Scheduler] Scheduler not running')
      return
    }

    clearInterval(this.intervalId)
    this.intervalId = null
    console.log('[SAM Scheduler] Scheduler stopped')
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry(attempt = 1): Promise<void> {
    if (this.isRunning) {
      console.warn('[SAM Scheduler] Run already in progress, skipping')
      return
    }

    this.isRunning = true

    try {
      console.log(
        `[SAM Scheduler] Executing run ${attempt}/${this.config.maxRetries}`
      )
      const result = await runSAMDiscoveryAgent(this.config.daysBack)

      console.log('[SAM Scheduler] Run completed:', {
        status: result.status,
        recordsProcessed: result.recordsProcessed,
        recordsSaved: result.recordsSaved,
        errors: result.errors?.length || 0,
      })

      // Log to monitoring system (Slack, etc.)
      if (result.status === 'error' || result.errors?.length > 0) {
        console.warn('[SAM Scheduler] Run had errors:', result.errors)
      }
    } catch (error) {
      console.error(
        `[SAM Scheduler] Run failed (attempt ${attempt}/${this.config.maxRetries}):`,
        error
      )

      // Retry on failure
      if (attempt < this.config.maxRetries) {
        console.log(
          `[SAM Scheduler] Retrying in ${this.config.retryDelay}ms...`
        )
        await this.delay(this.config.retryDelay)
        await this.executeWithRetry(attempt + 1)
      } else {
        console.error('[SAM Scheduler] Max retries exceeded, giving up')
      }
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Helper: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    enabled: boolean
    running: boolean
    interval: number
    daysBack: number
    isActive: boolean
  } {
    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      interval: this.config.interval,
      daysBack: this.config.daysBack,
      isActive: this.intervalId !== null,
    }
  }
}

/**
 * Create and start a default scheduler instance
 * Usage: in your app initialization
 *
 * const scheduler = initializeSAMScheduler()
 * scheduler.start()
 */
export function initializeSAMScheduler(
  config?: Partial<SchedulerConfig>
): SAMDiscoveryScheduler {
  return new SAMDiscoveryScheduler(config)
}

// For direct cron integration (vercel, railway, etc.)
export async function cronSAMDiscovery(): Promise<void> {
  console.log('[SAM Cron] Running SAM discovery from cron')
  const result = await runSAMDiscoveryAgent()
  console.log('[SAM Cron] Completed:', result)
}
