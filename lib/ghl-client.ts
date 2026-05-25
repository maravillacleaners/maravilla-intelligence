export interface GHLContact {
  id: string
  email: string
  firstName: string
  lastName: string
  status: string
}

const GHL_API_URL = 'https://rest.gohighlevel.com/v1'

export async function syncContactToGHL(
  email: string,
  name: string,
  locationId: string
): Promise<{ success: boolean; contactId?: string }> {
  const apiKey = process.env.GHL_API_KEY

  if (!apiKey || !locationId) {
    console.log('[GHL] Missing credentials, logging sync attempt')
    console.log(`[GHL] Syncing contact: ${email} (${name})`)
    return { success: true, contactId: 'mock_' + Date.now() }
  }

  try {
    // First, search for existing contact
    const searchResponse = await fetch(
      `${GHL_API_URL}/contacts/search?email=${encodeURIComponent(email)}&locationId=${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    let contactId: string

    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      if (searchData.contacts && searchData.contacts.length > 0) {
        contactId = searchData.contacts[0].id
        console.log(`[GHL] Found existing contact: ${contactId}`)
      } else {
        // Create new contact
        const createResponse = await fetch(
          `${GHL_API_URL}/contacts/?locationId=${locationId}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              firstName: name.split(' ')[0],
              lastName: name.split(' ').slice(1).join(' '),
              status: 'lead',
              source: 'maravilla-intelligence',
            }),
          }
        )

        if (!createResponse.ok) {
          console.error(`GHL create error: ${createResponse.status}`)
          return { success: false }
        }

        const createData = await createResponse.json()
        contactId = createData.id || createData.contact?.id
        console.log(`[GHL] Created new contact: ${contactId}`)
      }
    } else {
      console.error(`GHL search error: ${searchResponse.status}`)
      return { success: false }
    }

    return { success: true, contactId }
  } catch (error) {
    console.error('Error syncing contact to GHL:', error)
    // Log error but don't fail the approval
    console.log(`[GHL] Sync failed for ${email}, but approval will proceed`)
    return { success: true, contactId: 'sync_error_' + Date.now() }
  }
}

export async function updateContactStatus(
  contactId: string,
  status: string,
  locationId: string
): Promise<boolean> {
  const apiKey = process.env.GHL_API_KEY

  if (!apiKey) {
    console.log(`[GHL] Mock: Update contact ${contactId} to status ${status}`)
    return true
  }

  try {
    const response = await fetch(
      `${GHL_API_URL}/contacts/${contactId}?locationId=${locationId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      }
    )

    if (!response.ok) {
      console.error(`GHL update error: ${response.status}`)
      return false
    }

    console.log(`[GHL] Updated contact ${contactId} to ${status}`)
    return true
  } catch (error) {
    console.error('Error updating contact status:', error)
    return false
  }
}
