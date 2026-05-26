export interface Prospect {
  id: string
  legalName: string
  dba?: string
  domain?: string
  naics?: string
  naicsDesc?: string
  segment?: string
  priority?: 'High' | 'Medium' | 'Low'
  county?: string
  source?: string
  sunbizStatus?: string
  entityType?: string
  daysSinceFormed?: number
  formedDate?: string
  address?: { line: string; city: string; state: string; zip: string }
  officer?: { name: string; role: string; samRegistered?: boolean }
  contact?: { name: string; title: string; email: string; phone: string; linkedin?: string }
  intelligence?: {
    score: number
    ticketEstimate: number
    serviceFit: number
    priorityScore: number
    rank: { position: number; total: number; group: string }
    icebreaker: string
    intentSignal: string
    reasoning: string[]
  }
  scoreBreakdown?: { label: string; points: number; weight: number; note: string }[]
  sqft?: number
  pipelineStage?: string
  daysInStage?: number
  emailDraft?: { to: string; subject: string; body: string }
  emailVariants?: Record<string, { subject: string; body: string }>
  timeline?: { ts: string; who: string; run?: string; evt: string; detail: string }[]
  // from Airtable
  score?: number
  pipeline_status?: string
  ghl_contact_id?: string
}

export interface QueueItem {
  id: string
  legalName: string
  segment: string
  county: string
  score: number
  ticket: number
  days: number
  stage: string
  priority: string
  current?: boolean
}

export interface Notification {
  id: string
  ts: string
  type: 'score' | 'building' | 'subgap' | 'contract' | 'system' | 'reply' | 'won' | 'optout'
  priority: 'high' | 'med' | 'low'
  title: string
  body: string
  actor: string
  actorMeta?: string
  actionLabel?: string
  read: boolean
}

export interface Toast {
  id: string
  title: string
  body?: string
  tone?: 'success' | 'danger' | 'info' | 'warning'
  actionLabel?: string
  onAction?: () => void
}

export type ToneName = 'neutral' | 'indigo' | 'emerald' | 'amber' | 'red' | 'blue' | 'mono' | 'dark'
export type SizeName = 'sm' | 'md' | 'lg'
export type VariantName = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'
