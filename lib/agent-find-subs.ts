import Airtable from 'airtable'
import { ScoredAward } from './agent-awards'

const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

export interface SupplierMatch {
  awardId: string
  supplierId: string
  supplierName: string
  matchScore: number
  serviceMatch: boolean
  locationMatch: boolean
  capacityMatch: boolean
  matchReason: string
}

export interface SupplierWithCapacity {
  id: string
  name: string
  services: string[]
  counties: string[]
  capacity: number
  registrationStatus: string
}

async function getActiveSuppliers(): Promise<SupplierWithCapacity[]> {
  try {
    const base = api.base(process.env.AIRTABLE_SUBS_BASE_ID!)
    const table = base('Suppliers')

    const records = await table.select({
      filterByFormula: `{registration_status} = 'Active'`
    }).all()

    return records.map((record: any) => ({
      id: record.id,
      name: record.fields.company_name || 'Unknown',
      services: Array.isArray(record.fields.services_offered)
        ? record.fields.services_offered
        : [],
      counties: Array.isArray(record.fields.preferred_counties)
        ? record.fields.preferred_counties
        : [],
      capacity: record.fields.estimated_annual_capacity_usd || 0,
      registrationStatus: record.fields.registration_status || 'Unknown'
    }))
  } catch (error) {
    console.error('[SupplierFinder] Error fetching suppliers:', error)
    return []
  }
}

function normalizeServiceName(service: string): string {
  return service
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
}

function calculateDetailedMatchScore(
  award: ScoredAward,
  supplier: SupplierWithCapacity
): { score: number; serviceMatch: boolean; locationMatch: boolean; capacityMatch: boolean; reason: string } {
  let score = 0
  let serviceMatch = false
  let locationMatch = false
  let capacityMatch = false
  const reasons: string[] = []

  const cleaningServices = ['janitorial', 'cleaning', 'custodial', 'maintenance', 'hvac']
  const contractServices = award.description
    ? award.description.toLowerCase().split(/[\s,]+/)
    : []

  for (const service of supplier.services) {
    const normalizedService = normalizeServiceName(service)
    const isCleaningService = cleaningServices.some(cs =>
      normalizedService.includes(cs)
    )

    if (isCleaningService || award.description?.toLowerCase().includes(normalizedService)) {
      serviceMatch = true
      score += 50
      reasons.push('Services match')
      break
    }
  }

  if (!serviceMatch && award.naicsCode) {
    const cleaningNaics = ['561700', '561710', '561711', '561720']
    if (cleaningNaics.some(code => award.naicsCode?.includes(code))) {
      score += 30
      reasons.push('NAICS code indicates cleaning work')
    }
  }

  if (supplier.counties.length > 0 && award.agency) {
    const agencyLower = award.agency.toLowerCase()
    for (const county of supplier.counties) {
      if (agencyLower.includes(county.toLowerCase())) {
        locationMatch = true
        score += 30
        reasons.push(`Location match: ${county}`)
        break
      }
    }
  }

  if (supplier.capacity > 0 && award.estimatedValue > 0) {
    const capacityRatio = supplier.capacity / award.estimatedValue
    if (capacityRatio >= 0.2) {
      capacityMatch = true
      score += 20
      reasons.push('Capacity sufficient')
    } else if (capacityRatio >= 0.1) {
      score += 10
      reasons.push('Adequate capacity')
    }
  }

  return {
    score: Math.min(score, 100),
    serviceMatch,
    locationMatch,
    capacityMatch,
    reason: reasons.length > 0 ? reasons.join('; ') : 'Basic eligibility'
  }
}

export async function findMatchingSuppliers(
  scoredAwards: ScoredAward[],
  minScoreThreshold: number = 50
): Promise<SupplierMatch[]> {
  const suppliers = await getActiveSuppliers()
  const matches: SupplierMatch[] = []

  for (const award of scoredAwards) {
    if (award.totalScore < minScoreThreshold) {
      console.log(`[SupplierFinder] Award ${award.id} score ${award.totalScore} below threshold`)
      continue
    }

    for (const supplier of suppliers) {
      const {
        score,
        serviceMatch,
        locationMatch,
        capacityMatch,
        reason
      } = calculateDetailedMatchScore(award, supplier)

      if (score >= 60) {
        matches.push({
          awardId: award.id,
          supplierId: supplier.id,
          supplierName: supplier.name,
          matchScore: score,
          serviceMatch,
          locationMatch,
          capacityMatch,
          matchReason: reason
        })
      }
    }
  }

  console.log(`[SupplierFinder] Found ${matches.length} supplier matches for ${scoredAwards.length} awards`)
  return matches
}

export async function saveSupplierMatches(matches: SupplierMatch[]): Promise<void> {
  try {
    const base = api.base(process.env.AIRTABLE_SUBS_BASE_ID!)
    const table = base('Supplier_Opportunities')

    for (const match of matches) {
      try {
        const existing = await table.select({
          filterByFormula: `AND({supplier_id} = '${match.supplierId}', {opportunity_id} = '${match.awardId}')`
        }).firstPage()

        if (existing.length === 0) {
          await table.create({
            supplier_id: match.supplierId,
            supplier_name: match.supplierName,
            opportunity_id: match.awardId,
            match_score: match.matchScore,
            match_reason: match.matchReason,
            service_match: match.serviceMatch,
            location_match: match.locationMatch,
            capacity_match: match.capacityMatch,
            status: 'Available',
            date_matched: new Date().toISOString().split('T')[0],
            notification_sent: false
          })
          console.log(`[SupplierFinder] Created match: ${match.awardId} → ${match.supplierName}`)
        }
      } catch (error: any) {
        if (error.error?.type === 'DUPLICATE_FIELD_VALUE') {
          console.log(`[SupplierFinder] Match already exists: ${match.awardId} → ${match.supplierId}`)
        } else {
          console.error(`[SupplierFinder] Failed to save match:`, error)
        }
      }
    }

    console.log(`[SupplierFinder] Saved ${matches.length} supplier opportunity matches`)
  } catch (error) {
    console.error('[SupplierFinder] Save error:', error)
  }
}

export async function updateAwardMatchingStatus(awardIds: string[]): Promise<void> {
  try {
    const base = api.base(process.env.AIRTABLE_BASE_ID!)
    const table = base('Intelligence')

    for (const awardId of awardIds) {
      try {
        const existing = await table.select({
          filterByFormula: `{id} = '${awardId}'`
        }).firstPage()

        if (existing.length > 0) {
          await table.update(existing[0].id, {
            matching_status: 'matched',
            match_date: new Date().toISOString().split('T')[0]
          })
        }
      } catch (error) {
        console.error(`[SupplierFinder] Failed to update award ${awardId}:`, error)
      }
    }
  } catch (error) {
    console.error('[SupplierFinder] Status update error:', error)
  }
}
