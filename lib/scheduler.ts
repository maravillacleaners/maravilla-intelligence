import cron from 'node-cron'
import { scrapeSamGov, saveContractsToAirtable } from './scrapers/sam-gov-scraper'
import { scrapeUSASpending, saveAwardsToAirtable } from './scrapers/usaspending-scraper'
import { matchContractsToSuppliers, createMatches } from './contract-matching'

export function initializeScheduler() {
  console.log('[Scheduler] Starting automation jobs...')

  // SAM.gov: Every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Scheduler] Running SAM.gov scrape...')
    const contracts = await scrapeSamGov()
    await saveContractsToAirtable(contracts)
  })

  // USASpending: Daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[Scheduler] Running USASpending scrape...')
    const awards = await scrapeUSASpending()
    await saveAwardsToAirtable(awards)
  })

  // Auto-matching: Every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Running contract matching...')
    const matches = await matchContractsToSuppliers()
    await createMatches(matches)
  })

  // Supplier notifications: Every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Scheduler] Sending supplier notifications...')
    // await sendNewOpportunityNotifications()
  })

  console.log('[Scheduler] All jobs scheduled ✓')
}

export function stopScheduler() {
  console.log('[Scheduler] Stopping automation jobs')
  cron.getTasks().forEach(task => task.stop())
}
