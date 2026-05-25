import { matchContractsToSuppliers, createMatches } from '@/lib/contract-matching'

export async function POST(request: Request) {
  try {
    const matches = await matchContractsToSuppliers()
    await createMatches(matches)

    return Response.json({
      success: true,
      matched: matches.length,
      matches: matches.slice(0, 10),
    })
  } catch (error) {
    console.error('Auto-match error:', error)
    return Response.json({ error: 'Matching failed' }, { status: 500 })
  }
}
