/**
 * Admin Supplier Management API
 * GET /api/admin/suppliers - List all suppliers
 * PUT /api/admin/suppliers - Approve/reject supplier
 */

import { listSuppliers, updateSupplier } from '@/lib/suppliers-client'

/**
 * GET handler - List all suppliers with optional status filter
 * Query params:
 *   - status: 'Pending Review' | 'Active' | 'Rejected' | 'Approved' | 'Inactive'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const adminSecret = process.env.ADMIN_SECRET ?? 'maravilla-admin-2026'
    if (!token || token !== adminSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const suppliers = await listSuppliers({ status: status || undefined })

    return Response.json({
      success: true,
      suppliers,
      count: suppliers.length,
    })
  } catch (error) {
    console.error('[GET /api/admin/suppliers] Error:', error)
    return Response.json(
      {
        error: 'Failed to fetch suppliers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT handler - Update supplier registration status (approve/reject)
 * Request body:
 *   - supplier_id: string (required)
 *   - registration_status: 'Approved' | 'Rejected' (required)
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    const { supplier_id, registration_status } = body

    if (!supplier_id || typeof supplier_id !== 'string' || !supplier_id.trim()) {
      return Response.json({ error: 'Missing or invalid supplier_id' }, { status: 400 })
    }

    if (
      !registration_status ||
      typeof registration_status !== 'string' ||
      !['Approved', 'Active', 'Rejected', 'Pending Review', 'Inactive'].includes(
        registration_status
      )
    ) {
      return Response.json(
        {
          error: 'Invalid registration_status. Must be one of: Approved, Active, Rejected, Pending Review, Inactive',
        },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const adminSecret = process.env.ADMIN_SECRET ?? 'maravilla-admin-2026'
    if (!token || token !== adminSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update supplier status
    await updateSupplier(supplier_id, {
      registration_status: registration_status as any,
    })

    return Response.json({
      success: true,
      message: `Supplier ${supplier_id} status updated to ${registration_status}`,
      supplier_id,
      registration_status,
    })
  } catch (error) {
    console.error('[PUT /api/admin/suppliers] Error:', error)

    // Check if it's a "not found" error
    if (error instanceof Error && error.message.includes('Supplier not found')) {
      return Response.json(
        {
          error: 'Supplier not found',
        },
        { status: 404 }
      )
    }

    return Response.json(
      {
        error: 'Failed to update supplier',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
