import { readAuth } from "@/lib/auth"
import { NextRequest } from "next/server"

const AIRTABLE_API_URL = "https://api.airtable.com/v0"
const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

interface Match {
  id: string
  legalName: string
  naics: string
  county: string
  state: string
  days: number
  registrationDate: string
  predictedScore: number
  action: "auto-approve" | "queue" | "drop"
  watchId: string
  matchedFields: string[]
}

interface Watch {
  id: string
  name: string
  active: boolean
  naics: string[]
  counties: string[]
  zips: string[]
  entityType: string[]
  ageMin: number
  ageMax: number
  scoreTemplate: string
  autoApproveThreshold: number
  queueThreshold: number
}

async function getIntelligenceRecords() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return getMockIntelligenceRecords()
  }

  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Intelligence?pageSize=100&filterByFormula=AND({record_type}="prospect",{score}>50)`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      }
    )

    if (!response.ok) {
      return getMockIntelligenceRecords()
    }

    const data = await response.json()
    const records = data.records || []

    return records.map((r: any) => ({
      id: r.id,
      legalName: r.fields.legal_name,
      naics: r.fields.naics,
      county: r.fields.county,
      state: r.fields.state,
      registrationDate: r.fields.registration_date,
      score: r.fields.score || 50,
      entityType: r.fields.entity_type,
    }))
  } catch (error) {
    console.warn("Discovery: Intelligence fetch failed")
    return getMockIntelligenceRecords()
  }
}

async function getActiveWatches() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return getMockWatches()
  }

  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Watches?pageSize=50&filterByFormula={active}=TRUE()`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      }
    )

    if (!response.ok) {
      return getMockWatches()
    }

    const data = await response.json()
    const records = data.records || []

    return records.map((r: any) => ({
      id: r.id,
      name: r.fields.name,
      active: true,
      naics: r.fields.naics || [],
      counties: r.fields.counties || [],
      zips: r.fields.zips || [],
      entityType: r.fields.entity_type || [],
      ageMin: r.fields.age_min || 0,
      ageMax: r.fields.age_max || 365,
      scoreTemplate: r.fields.score_template || "default",
      autoApproveThreshold: r.fields.auto_approve_threshold || 75,
      queueThreshold: r.fields.queue_threshold || 55,
    }))
  } catch (error) {
    console.warn("Discovery: Watches fetch failed")
    return getMockWatches()
  }
}

function scoreMatch(prospect: any, watch: Watch): number {
  let score = 50

  if (watch.naics.includes(prospect.naics)) {
    score += 35
  } else if (prospect.naics) {
    const prospectNaicsPrefix = prospect.naics.substring(0, 4)
    if (watch.naics.some((n) => n.startsWith(prospectNaicsPrefix))) {
      score += 15
    }
  }

  if (watch.counties.includes(prospect.county)) {
    score += 20
  }

  const daysOld = Math.ceil(
    (Date.now() - new Date(prospect.registrationDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysOld >= watch.ageMin && daysOld <= watch.ageMax) {
    score += 10
  }

  if (watch.entityType.length > 0 && prospect.entityType) {
    if (watch.entityType.includes(prospect.entityType)) {
      score += 10
    }
  }

  if (prospect.score && prospect.score > 50) {
    score = Math.min(prospect.score + (score - 50), 100)
  }

  return Math.min(score, 100)
}

function getMockIntelligenceRecords() {
  return [
    {
      id: "p1",
      legalName: "Brickell Property Group LLC",
      naics: "531311",
      county: "Miami-Dade",
      state: "FL",
      registrationDate: new Date(Date.now() - 23 * 24 * 3600000).toISOString(),
      score: 85,
      entityType: "LLC",
    },
    {
      id: "p2",
      legalName: "Edgewater Living LLC",
      naics: "531311",
      county: "Miami-Dade",
      state: "FL",
      registrationDate: new Date(Date.now() - 41 * 24 * 3600000).toISOString(),
      score: 82,
      entityType: "LLC",
    },
    {
      id: "p3",
      legalName: "Bayfront Dental Group",
      naics: "621210",
      county: "Miami-Dade",
      state: "FL",
      registrationDate: new Date(Date.now() - 22 * 24 * 3600000).toISOString(),
      score: 75,
      entityType: "PA",
    },
  ]
}

function getMockWatches() {
  return [
    {
      id: "w1",
      name: "FL Property Managers · 0–30d",
      active: true,
      naics: ["531311", "531312"],
      counties: ["Miami-Dade", "Broward"],
      zips: ["33131", "33132"],
      entityType: ["LLC", "Inc"],
      ageMin: 0,
      ageMax: 30,
      scoreTemplate: "property-manager-scoring",
      autoApproveThreshold: 80,
      queueThreshold: 60,
    },
    {
      id: "w2",
      name: "Healthcare · Miami-Dade",
      active: true,
      naics: ["621210", "621498"],
      counties: ["Miami-Dade"],
      zips: [],
      entityType: ["LLC", "PA", "PLLC"],
      ageMin: 0,
      ageMax: 60,
      scoreTemplate: "healthcare-scoring",
      autoApproveThreshold: 75,
      queueThreshold: 55,
    },
  ]
}

export async function GET(request: NextRequest) {
  try {
    const auth = await readAuth(request)
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const watchId = searchParams.get("watchId")
    const action = searchParams.get("action")

    const watches = await getActiveWatches()
    const prospects = await getIntelligenceRecords()

    const matches: Match[] = []

    for (const prospect of prospects) {
      for (const watch of watches) {
        const score = scoreMatch(prospect, watch)
        const prospectAction =
          score >= watch.autoApproveThreshold
            ? "auto-approve"
            : score >= watch.queueThreshold
              ? "queue"
              : "drop"

        const daysOld = Math.ceil(
          (Date.now() - new Date(prospect.registrationDate).getTime()) / (1000 * 60 * 60 * 24)
        )

        matches.push({
          id: `${prospect.id}-${watch.id}`,
          legalName: prospect.legalName,
          naics: prospect.naics,
          county: prospect.county,
          state: prospect.state,
          days: daysOld,
          registrationDate: prospect.registrationDate,
          predictedScore: score,
          action: prospectAction,
          watchId: watch.id,
          matchedFields: [
            watch.naics.includes(prospect.naics) && "naics",
            watch.counties.includes(prospect.county) && "county",
            daysOld >= watch.ageMin && daysOld <= watch.ageMax && "age",
          ].filter(Boolean) as string[],
        })
      }
    }

    let filtered = matches
    if (watchId) {
      filtered = matches.filter((m) => m.watchId === watchId)
    }

    if (action && ["auto-approve", "queue", "drop"].includes(action)) {
      filtered = filtered.filter((m) => m.action === action)
    }

    filtered.sort((a, b) => b.predictedScore - a.predictedScore)

    return Response.json({
      success: true,
      data: filtered,
      summary: {
        total: filtered.length,
        autoApprove: filtered.filter((m) => m.action === "auto-approve").length,
        queue: filtered.filter((m) => m.action === "queue").length,
        drop: filtered.filter((m) => m.action === "drop").length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[API /discovery/matches] GET error:", error)
    return Response.json(
      { error: "Failed to fetch matches", details: String(error) },
      { status: 500 }
    )
  }
}
