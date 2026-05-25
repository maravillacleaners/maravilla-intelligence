/**
 * Supplier Profile API Route
 * GET /api/suppliers/[id] - Fetch supplier profile
 * PUT /api/suppliers/[id] - Update supplier profile
 *
 * Both endpoints require Bearer token authentication
 */

import { getSupplierById, updateSupplier } from '@/lib/suppliers-client'
import { getSupplierFromRequest } from '@/lib/suppliers-auth'

/**
 * GET handler for fetching supplier profile
 * Requires Bearer token in Authorization header
 * Only returns the profile of the authenticated supplier (cannot view other suppliers)
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
    // 2. SECURITY CHECK - Can only view own profile
    // ========================================================================
    if (supplier.supplier_id !== params.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ========================================================================
    // 3. FETCH SUPPLIER DATA
    // ========================================================================
    const data = await getSupplierById(params.id)
    if (!data) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // ========================================================================
    // 4. RETURN PROFILE DATA
    // ========================================================================
    return Response.json(
      {
        success: true,
        supplier: {
          legal_name: data.legal_name,
          contact_name: data.contact_name,
          business_email: data.business_email,
          phone: data.phone,
          website: data.website,
          services_offered: data.services_offered,
          preferred_counties: data.preferred_counties,
          estimated_annual_capacity_usd: data.estimated_annual_capacity_usd,
          notes: data.notes,
          registration_status: data.registration_status,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/suppliers/:id] Error:', error)
    return Response.json({ error: 'Failed to fetch supplier' }, { status: 500 })
  }
}

/**
 * PUT handler for updating supplier profile
 * Requires Bearer token in Authorization header
 * Only allows updating own profile
 * Auto-updates last_activity_date to today
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // ========================================================================
    // 1. VALIDATE TOKEN AND EXTRACT SUPPLIER
    // ========================================================================
    const supplier = getSupplierFromRequest(request)
    if (!supplier) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ========================================================================
    // 2. SECURITY CHECK - Can only update own profile
    // ========================================================================
    if (supplier.supplier_id !== params.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ========================================================================
    // 3. PARSE REQUEST BODY
    // ========================================================================
    const body = await request.json()

    // ========================================================================
    // 4. VALIDATE EDITABLE FIELDS
    // ========================================================================
    // Ensure user is not trying to edit read-only fields
    if (body.legal_name || body.business_email || body.supplier_id) {
      return Response.json(
        { error: 'Cannot modify protected fields (legal_name, business_email)' },
        { status: 400 }
      )
    }

    // ========================================================================
    // 5. UPDATE SUPPLIER
    // ========================================================================
    await updateSupplier(params.id, {
      contact_name: body.contact_name,
      phone: body.phone,
      website: body.website,
      services_offered: body.services_offered,
      preferred_counties: body.preferred_counties,
      estimated_annual_capacity_usd: body.estimated_annual_capacity_usd,
      notes: body.notes,
    })

    // ========================================================================
    // 6. FETCH AND RETURN UPDATED PROFILE
    // ========================================================================
    const updated = await getSupplierById(params.id)
    if (!updated) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return Response.json(
      {
        success: true,
        supplier: {
          legal_name: updated.legal_name,
          contact_name: updated.contact_name,
          business_email: updated.business_email,
          phone: updated.phone,
          website: updated.website,
          services_offered: updated.services_offered,
          preferred_counties: updated.preferred_counties,
          estimated_annual_capacity_usd: updated.estimated_annual_capacity_usd,
          notes: updated.notes,
          registration_status: updated.registration_status,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[PUT /api/suppliers/:id] Error:', error)
    return Response.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
}
