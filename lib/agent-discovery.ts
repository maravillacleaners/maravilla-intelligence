const Airtable = require('airtable')
const axios = require('axios')

const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

interface DiscoveryResult {
  id: string
  usaspendingId?: string
  samContractId?: string
  title: string
  agency: string
  recordType: 'contract' | 'award'
  source: 'sam-gov' | 'usaspending' | 'fedbizopps'
  deadline?: string
  estimatedValue: number
  description?: string
  naicsCode?: string
  url?: string
  postedDate: string
}

async function queryUSAspending(): Promise<DiscoveryResult[]> {
  try {
    const results: DiscoveryResult[] = []
    const url = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'

    const payload = {
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        award_amounts: [
          { lower_bound: 100000 }
        ],
        naics_codes: ['561700', '561710', '561711', '561720', '561730', '561740', '561790']
      },
      fields: [
        'Award ID',
        'Description',
        'Awarding Agency',
        'Award Amount',
        'naics_code',
        'Base Obligation Date'
      ],
      limit: 100,
      offset: 0
    }

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })

    const data = response.data as any
    const awards = data.results || []

    if (awards.length > 0) {
      console.log(`[Discovery] First award raw structure:`, JSON.stringify(awards[0], null, 2))
    }

    for (const award of awards) {
      const naicsCode = award.naics_code || award.naicsCode || award['naics_code'] || award['NAICS Code'] || ''
      const awardAmount = award.award_amount || award.awardAmount || award['Award Amount'] || 0

      const discovery = {
        id: `usaspending-${award.generated_internal_id}`,
        usaspendingId: award.generated_internal_id,
        title: award.description || 'Unnamed Award',
        agency: award.awarding_agency?.name || 'Unknown Agency',
        recordType: 'contract' as const,
        source: 'usaspending' as const,
        estimatedValue: typeof awardAmount === 'number' ? awardAmount : parseInt(awardAmount) || 0,
        description: award.description,
        naicsCode: naicsCode,
        url: `https://usaspending.gov/award/${award.generated_internal_id}`,
        postedDate: award.date_signed || new Date().toISOString().split('T')[0]
      }

      console.log(`[Discovery] Extracted award - ID: ${discovery.usaspendingId}, NAICS: ${discovery.naicsCode}, Value: $${discovery.estimatedValue}`)
      results.push(discovery)
    }

    console.log(`[Discovery] Found ${results.length} awards from USASpending`)
    return results
  } catch (error) {
    console.error('[Discovery] USASpending error:', error)
    return []
  }
}

async function queryFedBizOpps(): Promise<DiscoveryResult[]> {
  try {
    const results: DiscoveryResult[] = []
    const apiKey = process.env.SAM_GOV_API_KEY

    if (!apiKey) {
      console.warn('[Discovery] SAM.gov API key not configured')
      return []
    }

    const url = `https://api.sam.gov/prod/opportunities/v1/search?api_key=${apiKey}`

    const payload = {
      'postedFrom': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      'postedTo': new Date().toISOString().split('T')[0],
      'limit': 100,
      'offset': 0,
      'sort': [{ 'field': 'postedDate', 'direction': 'desc' }]
    }

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })

    const data = response.data as any
    const opportunities = data.opportunitiesData || []

    if (opportunities.length > 0) {
      console.log(`[Discovery] First SAM.gov opportunity raw structure:`, JSON.stringify(opportunities[0], null, 2))
    }

    for (const opp of opportunities) {
      const discovery = {
        id: `sam-${opp.noticeId}`,
        samContractId: opp.noticeId,
        title: opp.title || 'Unnamed Opportunity',
        agency: opp.department || 'Unknown Agency',
        recordType: 'contract' as const,
        source: 'sam-gov' as const,
        deadline: opp.responseDeadLine,
        estimatedValue: opp.classificationCode ? 50000 : 0,
        description: opp.synopsis,
        naicsCode: opp.classificationCode,
        url: `https://sam.gov/opp/${opp.noticeId}`,
        postedDate: opp.postedDate
      }

      console.log(`[Discovery] Extracted SAM opportunity - ID: ${discovery.samContractId}, NAICS: ${discovery.naicsCode}, Value: $${discovery.estimatedValue}`)
      results.push(discovery)
    }

    console.log(`[Discovery] Found ${results.length} opportunities from SAM.gov`)
    return results
  } catch (error) {
    console.error('[Discovery] SAM.gov error:', error)
    return []
  }
}

async function saveDiscoveriesToAirtable(discoveries: DiscoveryResult[]): Promise<void> {
  try {
    const base = api.base(process.env.AIRTABLE_BASE_ID!)
    const table = base('Intelligence')

    for (const discovery of discoveries) {
      try {
        const recordData: any = {
          title: discovery.title,
          record_type: discovery.recordType,
          source: discovery.source,
          deadline: discovery.deadline,
          estimated_value: discovery.estimatedValue,
          description: discovery.description,
          naics_code: discovery.naicsCode,
          url: discovery.url,
          discovery_date: discovery.postedDate
        }

        if (discovery.usaspendingId) {
          recordData.usaspending_id = discovery.usaspendingId
        }
        if (discovery.samContractId) {
          recordData.sam_contract_id = discovery.samContractId
        }

        const uniqueId = discovery.usaspendingId || discovery.samContractId || discovery.id
        console.log(`[Discovery] Saving record - ID: ${uniqueId}, NAICS: ${recordData.naics_code}, Value: $${recordData.estimated_value}`)

        await table.create(recordData)
        console.log(`[Discovery] Saved record: ${uniqueId}`)
      } catch (error: any) {
        const uniqueId = discovery.usaspendingId || discovery.samContractId || discovery.id
        if (error.error?.type === 'DUPLICATE_FIELD_VALUE') {
          console.log(`[Discovery] Record already exists: ${uniqueId}`)
        } else {
          console.error(`[Discovery] Failed to save ${uniqueId}:`, error)
        }
      }
    }

    console.log(`[Discovery] Saved ${discoveries.length} discoveries to Airtable`)
  } catch (error) {
    console.error('[Discovery] Save error:', error)
  }
}

module.exports = {
  queryUSAspending,
  queryFedBizOpps,
  saveDiscoveriesToAirtable
}
