import Airtable from 'airtable'

const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

export async function GET(request: Request) {
  try {
    const base = api.base(process.env.AIRTABLE_BASE_ID!)
    const table = base('Intelligence')

    const records = await table
      .select({
        filterByFormula: `{record_type} = 'contract'`,
        sort: [{ field: 'deadline', direction: 'asc' }],
        pageSize: 100,
      })
      .all()

    const contracts = records.map((r: any) => ({
      id: r.id,
      title: r.fields.title,
      agency: r.fields.agency,
      value: r.fields.estimated_value || 0,
      deadline: r.fields.deadline,
      status: r.fields.status || 'open',
    }))

    return Response.json({ contracts, count: contracts.length })
  } catch (error) {
    return Response.json({ error: 'Failed to fetch contracts' }, { status: 500 })
  }
}
