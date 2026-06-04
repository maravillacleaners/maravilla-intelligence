import axios, { AxiosError } from 'axios'
import { credentials, airtableTables } from '@/app/lib/credentials'

const RATE_LIMIT_DELAY = 500 // ms between requests

interface SAMOpportunity {
  noticeId: string
  title: string
  department: string
  agency: string
  responseDeadLine?: string
  postedDate: string
  synopsis?: string
  classificationCode?: string
  solicitationNumber?: string
  naicsCode?: string
  estimatedValue?: number
  awardType?: string
  url?: string
}

interface ProcessedOpportunity {
  id: string
  title: string
  agency: string
  department: string
  samContractId: string
  source: 'sam-gov'
  deadline?: string
  estimatedValue?: number
  description?: string
  naicsCode?: string
  classificationCode?: string
  solicitationNumber?: string
  awardType?: string
  url: string
  postedDate: string
  discoveredAt: string
  status: 'new' | 'updated'
}

interface AgentResult {
  agent: string
  status: 'success' | 'error' | 'partial'
  endpoint: string
  timestamp: string
  recordsProcessed: number
  recordsSaved: number
  errors: string[]
  nextRun?: string
  message?: string
}

class SAMDiscoveryAgent {
  private apiKey: string
  private baseId: string
  private opportunitiesTableId: string
  private baseUrl = 'https://api.sam.gov/prod/opportunities/v1/search'
  private airtableUrl = 'https://api.airtable.com/v0'

  constructor() {
    this.apiKey = credentials.samGovApiKey
    this.baseId = credentials.airtableBaseId
    this.opportunitiesTableId = airtableTables.opportunities

    if (!this.apiKey) {
      throw new Error('SAM_GOV_API_KEY not configured')
    }
    if (!this.baseId) {
      throw new Error('AIRTABLE_BASE_ID not configured')
    }
    if (!this.opportunitiesTableId) {
      throw new Error('Opportunities table not configured')
    }
  }

  /**
   * Fetch federal contract opportunities from SAM.gov
   */
  async fetchOpportunities(
    daysBack: number = 7,
    limit: number = 100
  ): Promise<SAMOpportunity[]> {
    try {
      const now = new Date()
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

      const postedFrom = startDate.toISOString().split('T')[0]
      const postedTo = now.toISOString().split('T')[0]

      console.log(
        `[SAM Discovery] Fetching opportunities from ${postedFrom} to ${postedTo}`
      )

      const payload = {
        postedFrom,
        postedTo,
        limit,
        offset: 0,
        sort: [{ field: 'postedDate', direction: 'desc' }],
      }

      const response = await axios.post(`${this.baseUrl}?api_key=${this.apiKey}`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      })

      const opportunities = response.data?.opportunitiesData || []
      console.log(
        `[SAM Discovery] Fetched ${opportunities.length} opportunities from SAM.gov`
      )

      return opportunities as SAMOpportunity[]
    } catch (error) {
      const axiosError = error as AxiosError
      console.error('[SAM Discovery] Fetch error:', {
        message: axiosError.message,
        status: axiosError.status,
      })
      throw error
    }
  }

  /**
   * Process raw SAM opportunities into standardized format
   */
  private processOpportunities(
    rawOpps: SAMOpportunity[]
  ): ProcessedOpportunity[] {
    return rawOpps.map((opp) => ({
      id: `sam-${opp.noticeId}`,
      title: opp.title || 'Unnamed Opportunity',
      agency: opp.agency || opp.department || 'Unknown Agency',
      department: opp.department || '',
      samContractId: opp.noticeId,
      source: 'sam-gov' as const,
      deadline: opp.responseDeadLine,
      estimatedValue: opp.estimatedValue || undefined,
      description: opp.synopsis,
      naicsCode: opp.naicsCode,
      classificationCode: opp.classificationCode,
      solicitationNumber: opp.solicitationNumber,
      awardType: opp.awardType,
      url: `https://sam.gov/opp/${opp.noticeId}`,
      postedDate: opp.postedDate,
      discoveredAt: new Date().toISOString(),
      status: 'new' as const,
    }))
  }

  /**
   * Check for existing record in Airtable to avoid duplicates
   */
  private async recordExists(samContractId: string): Promise<boolean> {
    try {
      const filter = encodeURIComponent(
        `{SAM Contract ID}="${samContractId}"`
      )
      const url = `${this.airtableUrl}/${this.baseId}/${this.opportunitiesTableId}?filterByFormula=${filter}&pageSize=1`

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${credentials.airtableApiKey}` },
        timeout: 5000,
      })

      return (response.data?.records?.length || 0) > 0
    } catch (error) {
      console.warn(`[SAM Discovery] Check exists error for ${samContractId}:`, error)
      return false
    }
  }

  /**
   * Save processed opportunities to Airtable
   */
  async saveToAirtable(
    opportunities: ProcessedOpportunity[]
  ): Promise<{ saved: number; skipped: number; errors: string[] }> {
    let saved = 0
    let skipped = 0
    const errors: string[] = []

    for (const opp of opportunities) {
      try {
        // Check if already exists
        const exists = await this.recordExists(opp.samContractId)
        if (exists) {
          console.log(
            `[SAM Discovery] Record already exists: ${opp.samContractId}`
          )
          skipped++
          continue
        }

        // Build Airtable record
        const recordData: Record<string, any> = {
          'Title': opp.title,
          'Agency': opp.agency,
          'Department': opp.department,
          'SAM Contract ID': opp.samContractId,
          'Source': 'sam-gov',
          'Description': opp.description,
          'NAICS Code': opp.naicsCode,
          'Classification Code': opp.classificationCode,
          'Solicitation Number': opp.solicitationNumber,
          'Award Type': opp.awardType,
          'Deadline': opp.deadline,
          'Estimated Value': opp.estimatedValue,
          'Posted Date': opp.postedDate,
          'Discovered At': opp.discoveredAt,
          'URL': opp.url,
          'Status': 'new',
        }

        // Remove undefined fields
        Object.keys(recordData).forEach((key) => {
          if (recordData[key] === undefined) {
            delete recordData[key]
          }
        })

        const url = `${this.airtableUrl}/${this.baseId}/${this.opportunitiesTableId}`
        await axios.post(
          url,
          { fields: recordData },
          {
            headers: { Authorization: `Bearer ${credentials.airtableApiKey}` },
            timeout: 5000,
          }
        )

        console.log(
          `[SAM Discovery] Saved opportunity: ${opp.samContractId} - ${opp.title}`
        )
        saved++

        // Rate limiting
        await this.delay(RATE_LIMIT_DELAY)
      } catch (error) {
        const axiosError = error as AxiosError
        const message = `Failed to save ${opp.samContractId}: ${axiosError.message}`
        console.error(`[SAM Discovery] ${message}`)
        errors.push(message)
      }
    }

    return { saved, skipped, errors }
  }

  /**
   * Helper: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Main run method - orchestrates the full discovery flow
   */
  async run(daysBack: number = 7): Promise<AgentResult> {
    const startTime = Date.now()
    const errors: string[] = []

    try {
      // Step 1: Fetch opportunities
      console.log('[SAM Discovery] Starting discovery run...')
      const rawOpportunities = await this.fetchOpportunities(daysBack, 100)

      if (rawOpportunities.length === 0) {
        console.log('[SAM Discovery] No opportunities found in date range')
        return {
          agent: 'SAM Discovery',
          status: 'success',
          endpoint: '/api/agents/sam-discovery',
          timestamp: new Date().toISOString(),
          recordsProcessed: 0,
          recordsSaved: 0,
          errors: [],
          message: 'No opportunities found in date range',
        }
      }

      // Step 2: Process opportunities
      console.log(`[SAM Discovery] Processing ${rawOpportunities.length} opportunities...`)
      const processedOpportunities = this.processOpportunities(rawOpportunities)

      // Step 3: Save to Airtable
      console.log(`[SAM Discovery] Saving to Airtable...`)
      const { saved, skipped, errors: saveErrors } = await this.saveToAirtable(
        processedOpportunities
      )

      const duration = Date.now() - startTime

      // Calculate next run (6 hours from now)
      const nextRun = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()

      return {
        agent: 'SAM Discovery',
        status: saveErrors.length === 0 ? 'success' : 'partial',
        endpoint: '/api/agents/sam-discovery',
        timestamp: new Date().toISOString(),
        recordsProcessed: processedOpportunities.length,
        recordsSaved: saved,
        errors: saveErrors,
        nextRun,
        message: `Processed ${processedOpportunities.length} opportunities, saved ${saved}, skipped ${skipped} duplicates in ${duration}ms`,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[SAM Discovery] Fatal error:', errorMessage)

      return {
        agent: 'SAM Discovery',
        status: 'error',
        endpoint: '/api/agents/sam-discovery',
        timestamp: new Date().toISOString(),
        recordsProcessed: 0,
        recordsSaved: 0,
        errors: [errorMessage],
        message: `Discovery failed: ${errorMessage}`,
      }
    }
  }
}

export async function runSAMDiscoveryAgent(daysBack: number = 7): Promise<AgentResult> {
  const agent = new SAMDiscoveryAgent()
  return agent.run(daysBack)
}

export default SAMDiscoveryAgent
