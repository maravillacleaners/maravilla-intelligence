import { NextRequest } from 'next/server'
import { syncContactToGHL } from '@/lib/ghl-client'
import { updateProspectStatus } from '@/lib/airtable-client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { name, email } = body
    const recordId = id

    if (!recordId) {
      return Response.json({ error: 'Missing record ID' }, { status: 400 })
    }

    console.log(`[API] Approving prospect: ${recordId}`)

    // Step 1: Sync to GHL
    const ghlEmail = email || `${recordId}@prospect.maravilla.com`
    const ghlName = name || 'Unknown Prospect'
    const locationId = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID || 'default'

    let ghlContactId: string | undefined
    try {
      const ghlResult = await syncContactToGHL(ghlEmail, ghlName, locationId)
      ghlContactId = ghlResult.contactId
    } catch (ghlError) {
      console.warn('[API] GHL sync failed (non-fatal):', ghlError)
    }

    // Step 2: Update Airtable status
    const updateResult = await updateProspectStatus(recordId, 'approved')
    if (!updateResult) {
      console.warn(`[API] Airtable update failed for ${recordId}`)
    }

    return Response.json({
      success: true,
      recordId,
      ghlContactId,
    })
  } catch (error) {
    console.error('[API] Error approving prospect:', error)
    return Response.json({ error: 'Failed to approve prospect' }, { status: 500 })
  }
}
