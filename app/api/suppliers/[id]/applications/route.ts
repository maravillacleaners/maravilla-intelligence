/**
 * Supplier Applications API Routes
 * GET /api/suppliers/[id]/applications - Fetch applications for supplier
 * POST /api/suppliers/[id]/applications - Create new application for supplier
 *
 * Both endpoints require Bearer token authentication
 */

import {
  getApplicationsForSupplier,
  createSupplierApplication,
  getSupplierById,
  getApplicationByOpportunity,
  getOpportunitiesForSupplier,
  updateSupplierOpportunity,
} from '@/lib/suppliers-client'
import { getSupplierFromRequest } from '@/lib/suppliers-auth'

/**
 * GET handler for fetching applications
 * Requires Bearer token in Authorization header
 * Only returns applications submitted by the authenticated supplier
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // ========================================================================
    // 1. VALIDATE TOKEN AND EXTRACT SUPPLIER
    // ========================================================================
    const supplier = getSupplierFromRequest(request)
    if (!supplier) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ========================================================================
    // 2. SECURITY CHECK - Can only view own applications
    // ========================================================================
    if (supplier.supplier_id !== id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ========================================================================
    // 3. FETCH APPLICATIONS FOR SUPPLIER
    // ========================================================================
    const applications = await getApplicationsForSupplier(id)

    // ========================================================================
    // 4. RETURN APPLICATIONS
    // ========================================================================
    return Response.json(
      {
        success: true,
        applications,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/suppliers/:id/applications] Error:', error)
    return Response.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}

/**
 * POST handler for creating new application
 * Requires Bearer token in Authorization header
 * Only allows creating applications for the authenticated supplier
 * Creates both an Application record and updates the Opportunity status to "Applied"
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // ========================================================================
    // 1. VALIDATE TOKEN AND EXTRACT SUPPLIER
    // ========================================================================
    const supplier = getSupplierFromRequest(request)
    if (!supplier) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ========================================================================
    // 2. SECURITY CHECK - Can only create applications for own supplier
    // ========================================================================
    if (supplier.supplier_id !== id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ========================================================================
    // 3. PARSE REQUEST BODY
    // ========================================================================
    const body = await request.json()
    const { opportunity_id } = body

    if (!opportunity_id) {
      return Response.json(
        { error: 'Missing required field: opportunity_id' },
        { status: 400 }
      )
    }

    // ========================================================================
    // 4. FETCH SUPPLIER DATA
    // ========================================================================
    const supplierData = await getSupplierById(id)
    if (!supplierData) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // ========================================================================
    // 5. CHECK IF ALREADY APPLIED TO THIS OPPORTUNITY
    // ========================================================================
    const existingApplication = await getApplicationByOpportunity(id, opportunity_id)
    if (existingApplication) {
      return Response.json(
        { error: 'You have already applied to this opportunity' },
        { status: 400 }
      )
    }

    // ========================================================================
    // 6. FETCH OPPORTUNITY DATA
    // ========================================================================
    const opportunities = await getOpportunitiesForSupplier(id)
    const opportunity = opportunities.find(o => o.id === opportunity_id)

    if (!opportunity) {
      return Response.json(
        { error: 'Opportunity not found or not available for this supplier' },
        { status: 404 }
      )
    }

    // ========================================================================
    // 7. CREATE APPLICATION
    // ========================================================================
    const today = new Date().toISOString().split('T')[0]

    const application = await createSupplierApplication({
      supplier_id: id,
      supplier_name: supplierData.legal_name,
      opportunity_id,
      opportunity_name: opportunity.opportunity_name,
      application_status: 'Submitted',
      application_date: today,
    })

    // ========================================================================
    // 8. UPDATE OPPORTUNITY STATUS TO "Applied"
    // ========================================================================
    await updateSupplierOpportunity(opportunity_id, {
      status: 'Applied',
      date_applied: today,
    })

    // ========================================================================
    // 9. RETURN CREATED APPLICATION
    // ========================================================================
    return Response.json(
      {
        success: true,
        application,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/suppliers/:id/applications] Error:', error)
    return Response.json({ error: 'Failed to create application' }, { status: 500 })
  }
}
