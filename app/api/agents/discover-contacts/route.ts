/**
 * POST /api/agents/discover-contacts
 * GET  /api/agents/discover-contacts
 *
 * Autonomous contact discovery agent using Hunter.io
 * Discovers and validates email addresses for companies
 * Stores results in Contacts (Avatars) table
 *
 * Requirements:
 * - AIRTABLE_API_KEY
 * - AIRTABLE_BASE_ID
 * - HUNTER_API_KEY
 *
 * Returns:
 * {
 *   "agent": "Contact Discovery",
 *   "status": "completed|running|error",
 *   "endpoint": "/api/agents/discover-contacts",
 *   "results": [{
 *     "company_id": "...",
 *     "company_name": "...",
 *     "domain": "...",
 *     "contacts_found": 0,
 *     "contacts_created": 0,
 *     "estimated_total": 0,
 *     "patterns": [],
 *     "timestamp": "2026-06-04T..."
 *   }],
 *   "summary": {
 *     "companies_processed": 0,
 *     "total_contacts_created": 0,
 *     "execution_time_seconds": 0
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { ContactDiscoveryAgent } from '@/lib/agent-contact-discovery'

export const dynamic = 'force-dynamic'

// In-memory execution state
let isRunning = false
let lastExecution: { startTime: number; status: string; results: any[]; summary: any } | null = null

async function executeDiscovery() {
  if (isRunning) {
    return {
      status: 'already_running',
      lastExecution,
    }
  }

  isRunning = true
  const startTime = Date.now()

  try {
    const agent = new ContactDiscoveryAgent()
    const results = await agent.execute()

    const summary = {
      companies_processed: results.length,
      total_contacts_created: results.reduce((sum, r) => sum + r.contacts_created, 0),
      total_contacts_found: results.reduce((sum, r) => sum + r.contacts_found, 0),
      estimated_total_contacts: results.reduce((sum, r) => sum + r.estimated_total, 0),
      execution_time_seconds: Math.round((Date.now() - startTime) / 1000),
    }

    lastExecution = {
      startTime,
      status: 'completed',
      results,
      summary,
    }

    console.log('[API] Contact discovery completed:', summary)

    return {
      status: 'completed',
      results,
      summary,
    }
  } catch (err: any) {
    console.error('[API] Contact discovery error:', err)

    const summary = {
      companies_processed: 0,
      total_contacts_created: 0,
      execution_time_seconds: Math.round((Date.now() - startTime) / 1000),
      error: err.message,
    }

    lastExecution = {
      startTime,
      status: 'error',
      results: [],
      summary,
    }

    return {
      status: 'error',
      error: err.message,
      summary,
    }
  } finally {
    isRunning = false
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check for authentication token
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/, '')

    if (!token) {
      return NextResponse.json(
        {
          agent: 'Contact Discovery',
          status: 'unauthorized',
          error: 'Missing Authorization token',
          endpoint: '/api/agents/discover-contacts',
        },
        { status: 401 }
      )
    }

    // Validate token (simple check against AIRTABLE_API_KEY for now)
    const validToken = process.env.AIRTABLE_API_KEY
    if (token !== validToken) {
      return NextResponse.json(
        {
          agent: 'Contact Discovery',
          status: 'unauthorized',
          error: 'Invalid token',
          endpoint: '/api/agents/discover-contacts',
        },
        { status: 401 }
      )
    }

    // Return last execution status
    return NextResponse.json(
      {
        agent: 'Contact Discovery',
        status: isRunning ? 'running' : lastExecution?.status || 'idle',
        endpoint: '/api/agents/discover-contacts',
        ...(lastExecution && {
          lastExecution: lastExecution.startTime,
          results: lastExecution.results,
          summary: lastExecution.summary,
        }),
      },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        agent: 'Contact Discovery',
        status: 'error',
        error: err.message,
        endpoint: '/api/agents/discover-contacts',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check for authentication token
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/, '')

    if (!token) {
      return NextResponse.json(
        {
          agent: 'Contact Discovery',
          status: 'unauthorized',
          error: 'Missing Authorization token',
          endpoint: '/api/agents/discover-contacts',
        },
        { status: 401 }
      )
    }

    // Validate token
    const validToken = process.env.AIRTABLE_API_KEY
    if (token !== validToken) {
      return NextResponse.json(
        {
          agent: 'Contact Discovery',
          status: 'unauthorized',
          error: 'Invalid token',
          endpoint: '/api/agents/discover-contacts',
        },
        { status: 401 }
      )
    }

    // Execute discovery
    const result = await executeDiscovery()

    return NextResponse.json(
      {
        agent: 'Contact Discovery',
        status: result.status,
        endpoint: '/api/agents/discover-contacts',
        results: result.results || [],
        summary: result.summary || {},
        ...(result.error && { error: result.error }),
      },
      { status: result.status === 'error' ? 500 : 200 }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        agent: 'Contact Discovery',
        status: 'error',
        error: err.message,
        endpoint: '/api/agents/discover-contacts',
      },
      { status: 500 }
    )
  }
}
