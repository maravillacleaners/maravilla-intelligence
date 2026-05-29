import { getSupplierById, updateSupplier, getOpportunitiesForSupplier, getApplicationsForSupplier } from '@/lib/suppliers-client'
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

    const data = await getSupplierById(id)
    if (!data) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const [opportunities, applications] = await Promise.all([
      getOpportunitiesForSupplier(id).catch(() => []),
      getApplicationsForSupplier(id).catch(() => []),
    ])

    return Response.json(
      {
        success: true,
        supplier: {
          legal_name: data.legal_name,
          contact_name: data.contact_name,
          business_email: data.business_email,
          phone: data.phone,
          website: data.website,
          sub_category: data.sub_category,
          notes: data.notes,
          registration_status: data.registration_status,
        },
        opportunities,
        applications,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/suppliers/:id] Error:', error)
    return Response.json({ error: 'Failed to fetch supplier' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supplier = getSupplierFromRequest(request)
    if (!supplier) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (supplier.supplier_id !== id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    if (body.legal_name || body.business_email || body.supplier_id) {
      return Response.json(
        { error: 'Cannot modify protected fields (legal_name, business_email)' },
        { status: 400 }
      )
    }

    await updateSupplier(id, {
      contact_name: body.contact_name,
      phone: body.phone,
      website: body.website,
      notes: body.notes,
    })

    const updated = await getSupplierById(id)
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
          sub_category: updated.sub_category,
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
