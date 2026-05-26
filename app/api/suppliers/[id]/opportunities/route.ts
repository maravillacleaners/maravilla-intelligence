import { getOpportunitiesForSupplier } from '@/lib/suppliers-client'
import { getSupplierFromRequest } from '@/lib/suppliers-auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supplier = getSupplierFromRequest(request)
    if (!supplier) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (supplier.supplier_id !== id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const opportunities = await getOpportunitiesForSupplier(id)

    return Response.json(
      {
        success: true,
        opportunities,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/suppliers/:id/opportunities] Error:', error)
    return Response.json({ error: 'Failed to fetch opportunities' }, { status: 500 })
  }
}
