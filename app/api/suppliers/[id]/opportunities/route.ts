/**
 * Supplier Opportunities API Route
 * GET /api/suppliers/[id]/opportunities - Fetch opportunities for supplier
 *
 * Requires Bearer token authentication
 * Only returns opportunities matched to the authenticated supplier
 */

import { getOpportunitiesForSupplier } from '@/lib/suppliers-client'
import { getSupplierFromRequest } from '@/lib/suppliers-auth'

/**
 * GET handler for fetching opportunities
 * Requires Bearer token in Authorization header
 * Only returns opportunities for the authenticated supplier
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // ========================================================================
    // 1. VALIDATE TOKEN AND EXTRACT SUPPLIER
    // ========================================================================
    const supplier = getSupplierFromRequest(request)
    if (!supplier) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ========================================================================
    // 2. SECURITY CHECK - Can only view own opportunities
    // ========================================================================
    if (supplier.supplier_id !== params.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ========================================================================
    // 3. FETCH OPPORTUNITIES FOR SUPPLIER
    // ========================================================================
    const opportunities = await getOpportunitiesForSupplier(params.id)

    // ========================================================================
    // 4. RETURN OPPORTUNITIES
    // ========================================================================
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
