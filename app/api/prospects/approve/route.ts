import { updateProspectStatus } from '@/lib/airtable-client'
import { syncContactToGHL } from '@/lib/ghl-client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { recordId, email, name, locationId } = body

    if (!recordId || !name) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`[API] Approving prospect: ${recordId}`)

    // Step 1: Sync to GHL
    console.log(`[API] Syncing to GHL: ${email} (${name})`)
    const ghlResult = await syncContactToGHL(
      email || 'no-email@example.com',
      name,
      locationId || 'default'
    )

    // Step 2: Update Airtable status
    console.log(`[API] Updating Airtable status for ${recordId}`)
    const updateResult = await updateProspectStatus(recordId, 'approved')

    if (!updateResult) {
      console.warn(`[API] Airtable update failed for ${recordId}`)
    }

    console.log(`[API] Approval complete for ${recordId}`)

    return Response.json({
      success: true,
      recordId,
      ghlContactId: ghlResult.contactId,
    })
  } catch (error) {
    console.error('[API] Error approving prospect:', error)
    return Response.json(
      { error: 'Failed to approve prospect' },
      { status: 500 }
    )
  }
}
