import Airtable from 'airtable'

const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

export interface ContractMatch {
  contractId: string
  supplierId: string
  matchScore: number
  reason: string
}

export async function matchContractsToSuppliers(): Promise<ContractMatch[]> {
  try {
    const intelligenceBase = api.base(process.env.AIRTABLE_BASE_ID!)
    const subsBase = api.base(process.env.AIRTABLE_SUBS_BASE_ID!)

    // Get all open contracts
    const contracts = await intelligenceBase('Intelligence')
      .select({
        filterByFormula: `AND({record_type} = 'contract', {status} = 'open')`,
      })
      .all()

    // Get all active suppliers
    const suppliers = await subsBase('Suppliers')
      .select({
        filterByFormula: `{registration_status} = 'Active'`,
      })
      .all()

    const matches: ContractMatch[] = []

    // Simple matching: if contract service matches supplier category
    for (const contract of contracts) {
      for (const supplier of suppliers) {
        const score = calculateMatchScore(contract.fields, supplier.fields)
        if (score >= 60) {
          matches.push({
            contractId: contract.id,
            supplierId: supplier.fields.supplier_id,
            matchScore: score,
            reason: `Services match (${score}% score)`,
          })
        }
      }
    }

    return matches
  } catch (error) {
    console.error('Matching error:', error)
    return []
  }
}

function calculateMatchScore(
  contract: any,
  supplier: any
): number {
  let score = 0

  // Service match (60%)
  const contractServices = String(contract.services_needed || '')
    .toLowerCase()
  const supplierCategory = String(supplier.sub_category || '').toLowerCase()

  if (contractServices.includes(supplierCategory)) score += 60

  // Location match (20%)
  const contractLocations = String(contract.locations || '').toLowerCase()
  const supplierCounties = String(supplier.preferred_counties || '').toLowerCase()

  if (
    contractLocations.length > 0 &&
    supplierCounties.includes(contractLocations)
  ) {
    score += 20
  }

  // Size match (20%)
  const contractValue = contract.estimated_value || 0
  const supplierCapacity = supplier.estimated_annual_capacity_usd || 0

  if (supplierCapacity >= contractValue * 0.1) score += 20

  return Math.min(score, 100)
}

export async function createMatches(matches: ContractMatch[]): Promise<void> {
  const subsBase = api.base(process.env.AIRTABLE_SUBS_BASE_ID!)
  const table = subsBase('Supplier_Opportunities')

  for (const match of matches) {
    try {
      await table.create({
        supplier_id: match.supplierId,
        opportunity_id: match.contractId,
        opportunity_name: 'Federal Contract Opportunity',
        match_score: match.matchScore,
        match_reason: match.reason,
        status: 'Available',
        date_matched: new Date().toISOString().split('T')[0],
      })
    } catch (error) {
      console.error('Failed to create match:', error)
    }
  }
}
