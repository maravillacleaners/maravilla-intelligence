'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import TopBar from '@/components/crm/top-bar'
import { Checkbox, Button, Chip, Bar, FilterPill, useToasts } from '@/components/crm/ui'
import { InvestigationModal } from '@/components/crm/investigation-modal'

interface Lead {
  id: string
  entity_name: string
  lead_type: string
  stage: string
  priority_score: number
  govcon_fit: number
  commercial_fit: number
  source: string
  agency: string
  location: string
  contactable: boolean
  has_decision_maker: boolean
  decision_maker_name?: string
  decision_maker_email?: string
  enrichment_needed: boolean
  signal_date: string
  created_time: string
}

const STAGE_TONE: Record<string, 'neutral' | 'indigo' | 'blue' | 'amber' | 'emerald' | 'red' | 'mono'> = {
  'New Signal': 'neutral',
  'Contact Found': 'indigo',
  'Outreach Ready': 'blue',
  'In Conversation': 'amber',
  'Proposal Sent': 'amber',
  'Won': 'emerald',
  'Lost': 'red',
  'Monitor': 'mono',
}

const DEBOUNCE_DELAY = 300

export default function QueuePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkRunning, setBulkRunning] = useState(false)
  const [rowStatus, setRowStatus] = useState<Record<string, 'idle' | 'running' | 'done' | 'error'>>({})
  const [searchQ, setSearchQ] = useState('')
  const [enrichFilter, setEnrichFilter] = useState<'all' | 'needed' | 'done'>('needed')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [investigatingId, setInvestigatingId] = useState<string | null>(null)
  const [investigatingData, setInvestigatingData] = useState<{ id: string; name: string; domain?: string } | null>(null)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const { toasts, addToast } = useToasts()

  const fetchLeads = useCallback(async (q = '', stage = '', source = '', searchOffset = 0) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (stage) params.set('stage', stage)
      if (source) params.set('source', source)
      params.set('limit', '50')
      params.set('offset', String(searchOffset))
      params.set('sort', 'Priority_Score')
      params.set('dir', 'desc')

      const res = await fetch(`/api/leads?${params}`)
      const json = await res.json()

      let filtered = json.records || []
      if (enrichFilter === 'needed') {
        filtered = filtered.filter((l: Lead) => l.enrichment_needed === true)
      } else if (enrichFilter === 'done') {
        filtered = filtered.filter((l: Lead) => l.has_decision_maker === true)
      }

      setLeads(filtered)
      setHasMore(json.has_more || false)
    } catch (err) {
      console.error('Failed to fetch leads:', err)
      addToast({ message: 'Failed to load leads', tone: 'red' })
    } finally {
      setLoading(false)
    }
  }, [enrichFilter, addToast])

  const handleSearch = useCallback((q: string) => {
    setSearchQ(q)
    setOffset(0)

    if (searchTimeout) clearTimeout(searchTimeout)

    const timeout = setTimeout(() => {
      fetchLeads(q, stageFilter, sourceFilter, 0)
    }, DEBOUNCE_DELAY)

    setSearchTimeout(timeout)
  }, [fetchLeads, stageFilter, sourceFilter, searchTimeout])

  useEffect(() => {
    fetchLeads(searchQ, stageFilter, sourceFilter, offset)
  }, [enrichFilter, stageFilter, sourceFilter])

  const allSourcesInData = useMemo(() => {
    const sources = new Set<string>()
    leads.forEach((l) => {
      if (l.source) sources.add(l.source)
    })
    return Array.from(sources).sort()
  }, [leads])

  const stages = ['New Signal', 'Contact Found', 'Outreach Ready', 'In Conversation', 'Proposal Sent', 'Won', 'Lost', 'Monitor']

  const totalInQueue = leads.length
  const withDM = leads.filter((l) => l.has_decision_maker).length
  const enrichNeeded = leads.filter((l) => l.enrichment_needed).length

  const allPageSelected = leads.length > 0 && leads.every((l) => selected.has(l.id))
  const someSelected = leads.some((l) => selected.has(l.id))

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected(new Set())
    } else {
      const newSet = new Set(selected)
      leads.forEach((l) => newSet.add(l.id))
      setSelected(newSet)
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selected)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelected(newSet)
  }

  const runBulkInvestigate = async () => {
    setBulkRunning(true)

    for (const id of Array.from(selected)) {
      setRowStatus((prev) => ({ ...prev, [id]: 'running' }))

      try {
        const res = await fetch('/api/leads/bulk-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id], action: 'investigate' }),
        })

        const json = await res.json()
        setRowStatus((prev) => ({ ...prev, [id]: json.ok ? 'done' : 'error' }))
      } catch (err) {
        console.error(`Failed to investigate ${id}:`, err)
        setRowStatus((prev) => ({ ...prev, [id]: 'error' }))
      }
    }

    setBulkRunning(false)
    addToast({ message: `${selected.size} leads investigation started`, tone: 'emerald' })
    setSelected(new Set())

    setTimeout(() => {
      fetchLeads(searchQ, stageFilter, sourceFilter, offset)
    }, 1000)
  }

  const getEnrichIcon = (lead: Lead, id: string) => {
    const status = rowStatus[id]
    if (status === 'running') return '⏳'
    if (status === 'done') return '✅'
    if (status === 'error') return '❌'
    if (lead.has_decision_maker) return '✅'
    if (lead.enrichment_needed) return '⚠️'
    return '—'
  }

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar screen="Queue" />

      {/* Stats Bar */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #E7E5E4',
          display: 'flex',
          gap: 24,
          fontSize: 13,
          color: '#78716C',
          fontWeight: 500,
        }}
      >
        <div>
          <span style={{ fontWeight: 600, color: '#1C1917' }}>{totalInQueue}</span> Total in queue
        </div>
        <div>
          <span style={{ fontWeight: 600, color: '#1C1917' }}>{selected.size}</span> Selected
        </div>
        <div>
          <span style={{ fontWeight: 600, color: '#1C1917' }}>{withDM}</span> With DM
        </div>
        <div>
          <span style={{ fontWeight: 600, color: '#1C1917' }}>{enrichNeeded}</span> Need enrich
        </div>
      </div>

      {/* Filters Row */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #E7E5E4',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search company..."
          value={searchQ}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #E7E5E4',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        />

        <FilterPill
          label="Needs Enrich"
          options={[
            { label: 'All', value: 'all' },
            { label: 'Needed', value: 'needed' },
            { label: 'Has DM', value: 'done' },
          ]}
          value={enrichFilter}
          onSelect={(v) => setEnrichFilter(v as 'all' | 'needed' | 'done')}
        />

        <FilterPill
          label="Stage"
          options={stages.map((s) => ({ label: s, value: s }))}
          value={stageFilter}
          onSelect={(v) => setStageFilter(v as string)}
        />

        <FilterPill
          label="Source"
          options={allSourcesInData.map((s) => ({ label: s, value: s }))}
          value={sourceFilter}
          onSelect={(v) => setSourceFilter(v as string)}
        />
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid #E7E5E4',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            background: '#F5F3FF',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>
            ✓ {selected.size} leads selected
          </div>
          <Button onClick={runBulkInvestigate} disabled={bulkRunning} variant="primary" size="sm">
            {bulkRunning ? '⏳ Investigating...' : '🔍 Investigate Selected'}
          </Button>
          <Button onClick={() => setSelected(new Set())} variant="ghost" size="sm">
            ✗ Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#78716C' }}>⏳ Loading leads...</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#78716C' }}>No leads found</div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              marginTop: 12,
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #E7E5E4' }}>
                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, width: 32 }}>
                  <Checkbox
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    indeterminate={someSelected && !allPageSelected}
                  />
                </th>
                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600 }}>Company</th>
                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, width: 130 }}>Stage</th>
                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, width: 80 }}>Score</th>
                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, width: 100 }}>Source</th>
                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, width: 110 }}>Enrich</th>
                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, width: 60 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  style={{
                    borderBottom: '1px solid #E7E5E4',
                    background: selected.has(lead.id) ? '#F5F3FF' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    const row = e.currentTarget as HTMLElement
                    const btn = row.querySelector('[data-action-btn]') as HTMLElement
                    if (btn) btn.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    const row = e.currentTarget as HTMLElement
                    const btn = row.querySelector('[data-action-btn]') as HTMLElement
                    if (btn) btn.style.opacity = '0'
                  }}
                >
                  <td style={{ padding: '8px 0', verticalAlign: 'middle' }}>
                    <Checkbox checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} />
                  </td>
                  <td style={{ padding: '8px 0', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 500, color: '#1C1917' }}>{lead.entity_name}</div>
                    <div style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>{lead.lead_type}</div>
                  </td>
                  <td style={{ padding: '8px 0', verticalAlign: 'middle' }}>
                    <Chip label={lead.stage} tone={STAGE_TONE[lead.stage] || 'neutral'} size="sm" />
                  </td>
                  <td style={{ padding: '8px 0', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bar value={lead.priority_score} max={100} width={50} />
                      <span style={{ fontSize: 12 }}>{lead.priority_score}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 0', verticalAlign: 'middle', fontSize: 12, color: '#78716C' }}>
                    {lead.source}
                  </td>
                  <td style={{ padding: '8px 0', verticalAlign: 'middle', fontSize: 14, textAlign: 'center' }}>
                    {getEnrichIcon(lead, lead.id)}
                  </td>
                  <td style={{ padding: '8px 0', verticalAlign: 'middle' }}>
                    <button
                      data-action-btn
                      onClick={() => {
                        setInvestigatingId(lead.id)
                        setInvestigatingData({
                          id: lead.id,
                          name: lead.entity_name,
                          domain: lead.agency?.toLowerCase().replace(/\s+/g, '') || '',
                        })
                      }}
                      style={{
                        opacity: 0,
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid #E7E5E4',
                        background: '#F5F3FF',
                        color: '#4F46E5',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'opacity 150ms',
                      }}
                    >
                      🔍
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && leads.length > 0 && (
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #E7E5E4',
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            onClick={() => {
              const newOffset = Math.max(0, offset - 50)
              setOffset(newOffset)
              fetchLeads(searchQ, stageFilter, sourceFilter, newOffset)
            }}
            disabled={offset === 0}
            variant="ghost"
            size="sm"
          >
            ← Prev
          </Button>
          <span style={{ fontSize: 12, color: '#78716C' }}>Page {Math.floor(offset / 50) + 1}</span>
          <Button onClick={() => {
            const newOffset = offset + 50
            setOffset(newOffset)
            fetchLeads(searchQ, stageFilter, sourceFilter, newOffset)
          }} disabled={!hasMore} variant="ghost" size="sm">
            Next →
          </Button>
        </div>
      )}

      {/* Investigation Modal */}
      {investigatingData && investigatingId && (
        <InvestigationModal
          leadId={investigatingId}
          entityName={investigatingData.name}
          domain={investigatingData.domain}
          onClose={() => {
            setInvestigatingId(null)
            setInvestigatingData(null)
          }}
          onComplete={() => {
            setInvestigatingId(null)
            setInvestigatingData(null)
            setTimeout(() => {
              fetchLeads(searchQ, stageFilter, sourceFilter, offset)
            }, 500)
          }}
        />
      )}

      {/* Toast Stack */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: '12px 16px',
              borderRadius: 6,
              background: toast.tone === 'red' ? '#FEE2E2' : '#ECFDF5',
              color: toast.tone === 'red' ? '#991B1B' : '#065F46',
              fontSize: 12,
              fontWeight: 500,
              pointerEvents: 'auto',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
