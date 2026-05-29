import { NextResponse } from 'next/server'

// USASpending sub-awards — who are existing primes actually subcontracting to?
// This is our supply intelligence: sub-contractors ALREADY doing federal work in FL

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const state = searchParams.get('state') || 'FL'
    const keyword = searchParams.get('q') || 'janitorial cleaning custodial'

    // Search for sub-awards in FL for cleaning-related contracts
    const payload = {
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        place_of_performance_scope: 'domestic',
        place_of_performance_locations: [{ country: 'USA', state }],
        naics_codes: { require: ['561720', '561700', '561790', '561722'] },
        award_amounts: [{ lower_bound: 25000, upper_bound: 10000000 }],
      },
      fields: [
        'Award ID', 'Recipient Name', 'Award Amount', 'Action Date',
        'Awarding Agency', 'NAICS Code', 'NAICS Description',
        'Type of Set Aside', 'Place of Performance City Code',
        'Place of Performance State Code',
      ],
      page: 1,
      limit: 50,
      sort: 'Award Amount',
      order: 'desc',
    }

    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) throw new Error(`USASpending error ${res.status}`)
    const data = await res.json()

    const results = (data.results || []).map((r: any) => ({
      id: r.internal_id,
      primeContractor: r['Recipient Name'] || 'Unknown',
      awardId: r['Award ID'] || '',
      amount: r['Award Amount'] || 0,
      agency: r['Awarding Agency'] || 'Federal',
      naics: r['NAICS Code'] || '561720',
      naicsDesc: r['NAICS Description'] || 'Janitorial Services',
      setAside: r['Type of Set Aside'] || 'Open Competition',
      city: r['Place of Performance City Code'] || '',
      state: r['Place of Performance State Code'] || state,
      generatedId: r.generated_internal_id || '',
      // Signal: primes with existing contracts are ACTIVE — contact them for sub opportunities
      subOpportunity: true,
    }))

    // Group by prime contractor to find who has the most work
    const byPrime: Record<string, { name: string; contracts: number; totalAmount: number; agencies: string[] }> = {}
    for (const r of results) {
      const key = r.primeContractor
      if (!byPrime[key]) {
        byPrime[key] = { name: key, contracts: 0, totalAmount: 0, agencies: [] }
      }
      byPrime[key].contracts++
      byPrime[key].totalAmount += r.amount
      if (!byPrime[key].agencies.includes(r.agency)) {
        byPrime[key].agencies.push(r.agency)
      }
    }

    const primes = Object.values(byPrime)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 20)

    return NextResponse.json({
      subawards: results,
      primes_ranked: primes,
      total: results.length,
      insight: `${primes.length} active prime contractors in ${state} for cleaning NAICS. These are your best sub targets — they already have federal contracts and need cleaning subs.`,
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[/api/sources/subawards]', err)
    return NextResponse.json({ subawards: [], primes_ranked: [], total: 0, error: String(err) }, { status: 500 })
  }
}
