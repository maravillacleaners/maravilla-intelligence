import Airtable from 'airtable'
import { verifyToken } from '@/lib/suppliers-auth'

const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

export async function GET(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const subsBase = api.base(process.env.AIRTABLE_SUBS_BASE_ID!)

    const records = await subsBase('Supplier_Opportunities')
      .select({
        filterByFormula: `{supplier_id} = '${decoded.supplier_id}'`,
        sort: [{ field: 'date_matched', direction: 'desc' }],
      })
      .all()

    const opportunities = records.map((r: any) => ({
      id: r.id,
      opportunity_name: r.fields.opportunity_name,
      agency: r.fields.agency,
      value: r.fields.contract_value_usd || 0,
      deadline: r.fields.deadline,
      match_score: r.fields.match_score || 0,
      status: r.fields.status || 'Available',
    }))

    return Response.json({ opportunities, count: opportunities.length })
  } catch (error) {
    return Response.json({ error: 'Failed to fetch opportunities' }, { status: 500 })
  }
}
