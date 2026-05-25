/**
 * Email tracking endpoint
 * Logs opens and clicks for analytics
 */

interface TrackingEvent {
  id: string
  event: 'open' | 'click'
  campaignId: string
  recordId: string
  timestamp: string
  userAgent?: string
  ipAddress?: string
}

// In-memory store (in production, would be a database)
const trackingEvents: TrackingEvent[] = []

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const trackingId = searchParams.get('id')
    const event = searchParams.get('event') || 'open'

    if (!trackingId) {
      return Response.json({ error: 'Missing tracking ID' }, { status: 400 })
    }

    // Parse tracking ID: campaignId-recordId-timestamp
    const [campaignId, recordId] = trackingId.split('-')

    const trackEvent: TrackingEvent = {
      id: trackingId,
      event: (event as 'open' | 'click') || 'open',
      campaignId,
      recordId,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    }

    trackingEvents.push(trackEvent)
    console.log(`[Tracking] ${event.toUpperCase()}: ${trackingId}`)

    // Return 1x1 transparent pixel
    const gif = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff,
      0xff, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02,
      0x02, 0x44, 0x01, 0x00, 0x3b,
    ])

    return new Response(gif, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store',
      },
    })
  } catch (error) {
    console.error('[API /track] Error:', error)
    // Still return 1x1 pixel on error
    const gif = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff,
      0xff, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02,
      0x02, 0x44, 0x01, 0x00, 0x3b,
    ])

    return new Response(gif, {
      headers: { 'Content-Type': 'image/gif' },
    })
  }
}

/**
 * Get tracking analytics
 */
export async function POST(request: Request) {
  try {
    const { campaignId } = await request.json()

    if (!campaignId) {
      return Response.json({ error: 'Missing campaignId' }, { status: 400 })
    }

    const campaignEvents = trackingEvents.filter(e => e.campaignId === campaignId)
    const opens = campaignEvents.filter(e => e.event === 'open').length
    const clicks = campaignEvents.filter(e => e.event === 'click').length
    const uniqueRecords = new Set(campaignEvents.map(e => e.recordId)).size

    console.log(`[Tracking] Analytics for ${campaignId}: ${opens} opens, ${clicks} clicks`)

    return Response.json({
      success: true,
      campaignId,
      totalEvents: campaignEvents.length,
      opens,
      clicks,
      uniqueRecords,
      events: campaignEvents,
    })
  } catch (error) {
    console.error('[API /track POST] Error:', error)
    return Response.json(
      { error: 'Failed to fetch tracking data', details: String(error) },
      { status: 500 }
    )
  }
}
