'use client'

import React, { useState, useMemo, useEffect, CSSProperties } from 'react'
import TopBar from '@/components/crm/top-bar'
import { Chip, StatusDot, Card, Button, Checkbox, LetterAvatar } from '@/components/crm/ui'

// ─── Mock Data ────────────────────────────────────────────────────────────────

interface WatchStats {
  matched7d: number
  scored7d: number
  autoApproved: number
  queued: number
  dropped: number
  won: number
}

interface Watch {
  id: string
  name: string
  active: boolean
  owner: string
  lastRun: string
  sourceFreq: string
  naics: string[]
  counties: string[]
  zips: string[]
  entityType: string[]
  ageMin: number
  ageMax: number
  enrichWith: string[]
  scoreTemplate: string
  sequence: string
  notifyChannel: string
  autoApproveThreshold: number
  queueThreshold: number
  stats: WatchStats
}

const WATCHES: Watch[] = [
  {
    id: 'w1',
    name: 'FL Property Managers · 0–30d',
    active: true,
    owner: 'sarah.k',
    lastRun: '2026-05-25T06:00:14Z',
    sourceFreq: 'Sunbiz daily 6am ET',
    naics: ['531311', '531312'],
    counties: ['Miami-Dade', 'Broward'],
    zips: ['33131', '33132'],
    entityType: ['LLC', 'Inc'],
    ageMin: 0,
    ageMax: 30,
    enrichWith: ['Clearbit', 'Apollo', 'LinkedIn'],
    scoreTemplate: 'claude-sonnet scoring · property manager profile',
    sequence: 'Warm intro · Property Manager',
    notifyChannel: 'Slack #hot-leads',
    autoApproveThreshold: 80,
    queueThreshold: 60,
    stats: { matched7d: 84, scored7d: 81, autoApproved: 32, queued: 38, dropped: 11, won: 9 },
  },
  {
    id: 'w2',
    name: 'Healthcare · Miami-Dade',
    active: true,
    owner: 'marcus.r',
    lastRun: '2026-05-25T06:00:14Z',
    sourceFreq: 'Sunbiz daily 6am ET',
    naics: ['621210', '621498'],
    counties: ['Miami-Dade'],
    zips: [],
    entityType: ['LLC', 'PA', 'PLLC'],
    ageMin: 0,
    ageMax: 60,
    enrichWith: ['Clearbit', 'Apollo'],
    scoreTemplate: 'claude-haiku scoring · healthcare profile',
    sequence: 'Healthcare intro',
    notifyChannel: 'Slack #hot-leads',
    autoApproveThreshold: 75,
    queueThreshold: 55,
    stats: { matched7d: 42, scored7d: 40, autoApproved: 15, queued: 20, dropped: 5, won: 4 },
  },
]

interface Match {
  id: string
  legalName: string
  naics: string
  county: string
  days: number
  predictedScore: number
  action: 'auto-approve' | 'queue' | 'drop'
  email: boolean
  current?: boolean
  award_amount?: number
}

const MATCHES: Match[] = [
  { id: 'm1', legalName: 'Brickell Property Group LLC', naics: '531311', county: 'Miami-Dade', days: 23, predictedScore: 87, action: 'auto-approve', email: true, current: true, award_amount: 1200000 },
  { id: 'm2', legalName: 'Edgewater Living LLC', naics: '531311', county: 'Miami-Dade', days: 41, predictedScore: 81, action: 'auto-approve', email: true, award_amount: 840000 },
  { id: 'm3', legalName: 'Skyline Brickell Holdings LLC', naics: '531312', county: 'Miami-Dade', days: 8, predictedScore: 79, action: 'auto-approve', email: false, award_amount: 0 },
  { id: 'm4', legalName: 'Coral Gables PM Co.', naics: '531311', county: 'Miami-Dade', days: 67, predictedScore: 74, action: 'queue', email: true, award_amount: 0 },
  { id: 'm5', legalName: 'Doral Industrial Park HOA', naics: '813990', county: 'Miami-Dade', days: 14, predictedScore: 72, action: 'queue', email: true, award_amount: 320000 },
  { id: 'm6', legalName: 'Aventura Residences Mgmt', naics: '531311', county: 'Miami-Dade', days: 84, predictedScore: 69, action: 'queue', email: false, award_amount: 0 },
  { id: 'm7', legalName: 'Bayfront Dental Group', naics: '621210', county: 'Miami-Dade', days: 22, predictedScore: 68, action: 'queue', email: true, award_amount: 0 },
  { id: 'm8', legalName: 'SLS Brickell Office Suites', naics: '531120', county: 'Miami-Dade', days: 35, predictedScore: 65, action: 'queue', email: true, award_amount: 560000 },
  { id: 'm9', legalName: 'Tobin Center Pediatrics', naics: '621498', county: 'Miami-Dade', days: 51, predictedScore: 61, action: 'queue', email: false, award_amount: 0 },
  { id: 'm10', legalName: 'Coastal RE Group LLC', naics: '531390', county: 'Miami-Dade', days: 91, predictedScore: 52, action: 'drop', email: false, award_amount: 0 },
  { id: 'm11', legalName: 'Bayview Fitness Center Inc', naics: '713940', county: 'Broward', days: 45, predictedScore: 48, action: 'drop', email: true, award_amount: 0 },
  { id: 'm12', legalName: 'Sunshine Wellness PLLC', naics: '621399', county: 'Broward', days: 112, predictedScore: 44, action: 'drop', email: false, award_amount: 0 },
]

interface StateEntry {
  code: string
  name: string
  registry?: string
  coverage: 'live' | 'planned' | 'manual'
  entities: number
  primary?: boolean
}

const STATES: StateEntry[] = [
  { code: 'FL', name: 'Florida', registry: 'Sunbiz · DOS', coverage: 'live', entities: 3120000, primary: true },
  { code: 'CA', name: 'California', registry: 'CA bizfile', coverage: 'live', entities: 4820000 },
  { code: 'TX', name: 'Texas', registry: 'TX SOSDirect', coverage: 'live', entities: 3480000 },
  { code: 'NY', name: 'New York', registry: 'NY DOS', coverage: 'live', entities: 2640000 },
  { code: 'AZ', name: 'Arizona', registry: 'AZ Corp Commission', coverage: 'live', entities: 982000 },
  { code: 'GA', name: 'Georgia', registry: 'GA Corporations', coverage: 'live', entities: 1840000 },
  { code: 'IL', name: 'Illinois', registry: 'IL Secretary of State', coverage: 'live', entities: 1620000 },
  { code: 'MD', name: 'Maryland', registry: 'MD Business Express', coverage: 'live', entities: 640000 },
  { code: 'MA', name: 'Massachusetts', registry: 'MA Corporations', coverage: 'live', entities: 740000 },
  { code: 'MI', name: 'Michigan', registry: 'MI LARA', coverage: 'live', entities: 980000 },
  { code: 'NV', name: 'Nevada', registry: 'NV SilverFlume', coverage: 'live', entities: 580000 },
  { code: 'NJ', name: 'New Jersey', registry: 'NJ Business', coverage: 'live', entities: 1180000 },
  { code: 'NC', name: 'North Carolina', registry: 'NC Secretary of State', coverage: 'live', entities: 1240000 },
  { code: 'OH', name: 'Ohio', registry: 'OH Secretary of State', coverage: 'live', entities: 1380000 },
  { code: 'OR', name: 'Oregon', registry: 'OR Business Registry', coverage: 'live', entities: 480000 },
  { code: 'PA', name: 'Pennsylvania', registry: 'PA Dept. of State', coverage: 'live', entities: 1340000 },
  { code: 'TN', name: 'Tennessee', registry: 'TN Secretary of State', coverage: 'live', entities: 740000 },
  { code: 'UT', name: 'Utah', registry: 'UT OneStop', coverage: 'live', entities: 380000 },
  { code: 'VA', name: 'Virginia', registry: 'VA SCC eFile', coverage: 'live', entities: 920000 },
  { code: 'WA', name: 'Washington', registry: 'WA Corporations', coverage: 'live', entities: 920000 },
  { code: 'WY', name: 'Wyoming', registry: 'WY Secretary of State', coverage: 'live', entities: 320000 },
  { code: 'CO', name: 'Colorado', registry: 'CO Secretary of State', coverage: 'live', entities: 1140000 },
  { code: 'DE', name: 'Delaware', registry: 'DE Division of Corps', coverage: 'live', entities: 1980000 },
  { code: 'AL', name: 'Alabama', coverage: 'planned', entities: 412000 },
  { code: 'AK', name: 'Alaska', coverage: 'planned', entities: 84000 },
  { code: 'AR', name: 'Arkansas', coverage: 'planned', entities: 312000 },
  { code: 'CT', name: 'Connecticut', coverage: 'planned', entities: 420000 },
  { code: 'HI', name: 'Hawaii', coverage: 'planned', entities: 142000 },
  { code: 'ID', name: 'Idaho', coverage: 'planned', entities: 218000 },
  { code: 'IN', name: 'Indiana', coverage: 'planned', entities: 720000 },
  { code: 'IA', name: 'Iowa', coverage: 'planned', entities: 380000 },
  { code: 'KS', name: 'Kansas', coverage: 'planned', entities: 312000 },
  { code: 'KY', name: 'Kentucky', coverage: 'planned', entities: 410000 },
  { code: 'LA', name: 'Louisiana', coverage: 'planned', entities: 380000 },
  { code: 'ME', name: 'Maine', coverage: 'planned', entities: 152000 },
  { code: 'MN', name: 'Minnesota', coverage: 'planned', entities: 620000 },
  { code: 'MS', name: 'Mississippi', coverage: 'planned', entities: 240000 },
  { code: 'MO', name: 'Missouri', coverage: 'planned', entities: 580000 },
  { code: 'MT', name: 'Montana', coverage: 'planned', entities: 168000 },
  { code: 'NE', name: 'Nebraska', coverage: 'planned', entities: 220000 },
  { code: 'NH', name: 'New Hampshire', coverage: 'planned', entities: 160000 },
  { code: 'NM', name: 'New Mexico', coverage: 'planned', entities: 198000 },
  { code: 'ND', name: 'North Dakota', coverage: 'planned', entities: 88000 },
  { code: 'OK', name: 'Oklahoma', coverage: 'planned', entities: 412000 },
  { code: 'RI', name: 'Rhode Island', coverage: 'planned', entities: 120000 },
  { code: 'SC', name: 'South Carolina', coverage: 'planned', entities: 480000 },
  { code: 'SD', name: 'South Dakota', coverage: 'planned', entities: 96000 },
  { code: 'VT', name: 'Vermont', coverage: 'planned', entities: 88000 },
  { code: 'WV', name: 'West Virginia', coverage: 'planned', entities: 178000 },
  { code: 'WI', name: 'Wisconsin', coverage: 'planned', entities: 540000 },
  { code: 'DC', name: 'District of Columbia', coverage: 'planned', entities: 120000 },
]

interface NaicsLeaf {
  code: string
  name: string
  count: number
  sizeStandard?: string
  selected: boolean
  primary?: boolean
}

interface NaicsGroup {
  code: string
  name: string
  count: number
  expanded?: boolean
  children?: NaicsGroup[] | NaicsLeaf[]
}

const NAICS_TREE: NaicsGroup[] = [
  {
    code: '56', name: 'Administrative & Support Services', count: 2840, expanded: true, children: [
      {
        code: '561', name: 'Administrative & Support Services', count: 2412, children: [
          {
            code: '5617', name: 'Services to Buildings & Dwellings', count: 1284, expanded: true, children: [
              { code: '561720', name: 'Janitorial Services', count: 842, sizeStandard: '$22M', primary: true, selected: true },
              { code: '561730', name: 'Landscaping Services', count: 284, sizeStandard: '$8M', selected: false },
              { code: '561740', name: 'Carpet & Upholstery Cleaning', count: 158, sizeStandard: '$8M', selected: false },
            ] as NaicsLeaf[],
          },
        ],
      },
    ],
  },
  {
    code: '53', name: 'Real Estate & Rental', count: 1842, expanded: true, children: [
      {
        code: '531', name: 'Real Estate', count: 1284, children: [
          {
            code: '5313', name: 'Activities Related to Real Estate', count: 554, expanded: true, children: [
              { code: '531311', name: 'Residential Property Managers', count: 247, sizeStandard: '$11M', selected: true, primary: true },
              { code: '531312', name: 'Nonresidential Property Managers', count: 198, sizeStandard: '$11M', selected: true },
              { code: '531320', name: 'Offices of Real Estate Appraisers', count: 56, sizeStandard: '$11.5M', selected: false },
            ] as NaicsLeaf[],
          },
        ],
      },
    ],
  },
  {
    code: '62', name: 'Health Care & Social Assistance', count: 1240, children: [
      {
        code: '621', name: 'Ambulatory Health Care Services', count: 980, children: [
          {
            code: '6212', name: 'Offices of Dentists', count: 318, children: [
              { code: '621210', name: 'Offices of Dentists', count: 318, sizeStandard: '$13M', selected: false },
            ] as NaicsLeaf[],
          },
          {
            code: '6213', name: 'Offices of Other Health Practitioners', count: 420, children: [
              { code: '621399', name: 'Offices of All Other Misc. Health Practitioners', count: 142, sizeStandard: '$13M', selected: false },
              { code: '621498', name: 'All Other Outpatient Care Centers', count: 98, sizeStandard: '$32M', selected: false },
            ] as NaicsLeaf[],
          },
        ],
      },
    ],
  },
]

const RUN_HISTORY = [
  { id: 'r1', ts: '2026-05-25T06:00:14Z', source: 'Sunbiz daily', matched: 14, scored: 13, autoApproved: 5, queued: 6, dropped: 2, errors: 0, durationMs: 4280 },
  { id: 'r2', ts: '2026-05-24T06:00:11Z', source: 'Sunbiz daily', matched: 11, scored: 10, autoApproved: 4, queued: 4, dropped: 2, errors: 0, durationMs: 3940 },
  { id: 'r3', ts: '2026-05-23T06:00:09Z', source: 'Sunbiz daily', matched: 17, scored: 17, autoApproved: 6, queued: 7, dropped: 4, errors: 1, durationMs: 5120 },
  { id: 'r4', ts: '2026-05-22T06:00:12Z', source: 'Sunbiz daily', matched: 9, scored: 9, autoApproved: 3, queued: 4, dropped: 2, errors: 0, durationMs: 3610 },
  { id: 'r5', ts: '2026-05-21T06:00:08Z', source: 'Sunbiz daily', matched: 21, scored: 20, autoApproved: 8, queued: 8, dropped: 4, errors: 0, durationMs: 6240 },
  { id: 'r6', ts: '2026-05-20T06:00:15Z', source: 'Sunbiz daily', matched: 12, scored: 12, autoApproved: 6, queued: 5, dropped: 1, errors: 0, durationMs: 4100 },
]

// ─── Helper functions ─────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

function fmtEntities(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? '#4F46E5' : '#E7E5E4',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.15s ease',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#FFFFFF',
          transition: 'left 0.15s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }}
      />
    </button>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#059669' : score >= 65 ? '#D97706' : '#78716C'
  const bg = score >= 80 ? '#ECFDF5' : score >= 65 ? '#FFFBEB' : '#F5F5F4'
  return (
    <span
      style={{
        fontFamily: 'JetBrains Mono, Consolas, monospace',
        fontSize: 12,
        fontWeight: 700,
        color,
        background: bg,
        borderRadius: 6,
        padding: '2px 7px',
        letterSpacing: 0,
      }}
    >
      {score}
    </span>
  )
}

function AgeBadge({ days }: { days: number }) {
  const color = days < 30 ? '#059669' : days < 60 ? '#D97706' : '#78716C'
  return (
    <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 11.5, color }}>
      {days}d
    </span>
  )
}

function ActionChip({ action }: { action: Match['action'] }) {
  if (action === 'auto-approve') return <Chip tone="emerald" size="sm">Auto-approve</Chip>
  if (action === 'queue') return <Chip tone="amber" size="sm">Queue</Chip>
  return <Chip tone="neutral" size="sm">Drop</Chip>
}

function WatchStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'indigo' | 'emerald' | 'amber' | 'neutral'
}) {
  const colors: Record<string, string> = {
    indigo: '#4F46E5',
    emerald: '#059669',
    amber: '#D97706',
    neutral: '#78716C',
  }
  const color = tone ? colors[tone] : '#1C1917'
  return (
    <div style={{ textAlign: 'center', minWidth: 72 }}>
      <div
        style={{
          fontFamily: 'JetBrains Mono, Consolas, monospace',
          fontSize: 22,
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#78716C', marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}

function PipelineBlock({
  icon,
  label,
  detail,
  tone,
}: {
  icon: string
  label: string
  detail: string
  tone?: 'indigo' | 'emerald' | 'amber' | 'neutral'
}) {
  const toneMap: Record<string, { bg: string; border: string; icon: string }> = {
    indigo: { bg: '#EEF2FF', border: '#C7D2FE', icon: '#4F46E5' },
    emerald: { bg: '#ECFDF5', border: '#A7F3D0', icon: '#059669' },
    amber: { bg: '#FFFBEB', border: '#FDE68A', icon: '#D97706' },
    neutral: { bg: '#F5F5F4', border: '#E7E5E4', icon: '#78716C' },
  }
  const t = toneMap[tone ?? 'neutral']
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: '#FFFFFF',
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        padding: '12px 16px',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: t.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1917' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: '#78716C', marginTop: 2, lineHeight: 1.4 }}>{detail}</div>
      </div>
    </div>
  )
}

function PipelineConnector() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', height: 20 }}>
      <div style={{ width: 2, height: '100%', background: '#E7E5E4' }} />
    </div>
  )
}

interface NaicsLeafNode {
  code: string
  name: string
  count: number
  sizeStandard?: string
  selected: boolean
  primary?: boolean
}

interface NaicsGroupNode {
  code: string
  name: string
  count: number
  expanded?: boolean
  children?: (NaicsGroupNode | NaicsLeafNode)[]
}

function isLeaf(node: NaicsGroupNode | NaicsLeafNode): node is NaicsLeafNode {
  return !('children' in node) || (node as NaicsGroupNode).children === undefined
}

function NaicsLeafRow({
  node,
  depth,
}: {
  node: NaicsLeafNode
  depth: number
}) {
  const [checked, setChecked] = useState(node.selected)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingLeft: depth * 16 + 8,
        paddingTop: 5,
        paddingBottom: 5,
        paddingRight: 8,
        borderRadius: 6,
        background: checked ? '#F5F3FF' : 'transparent',
      }}
    >
      <Checkbox checked={checked} onChange={setChecked} />
      <span
        style={{
          fontFamily: 'JetBrains Mono, Consolas, monospace',
          fontSize: 11,
          color: '#78716C',
          flexShrink: 0,
          minWidth: 56,
        }}
      >
        {node.code}
      </span>
      <span style={{ fontSize: 12.5, color: '#1C1917', flex: 1, lineHeight: 1.3 }}>{node.name}</span>
      {node.primary && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: '#4F46E5',
            background: '#EEF2FF',
            borderRadius: 4,
            padding: '2px 5px',
            letterSpacing: '0.04em',
          }}
        >
          PRIMARY
        </span>
      )}
      {node.sizeStandard && (
        <span style={{ fontSize: 11, color: '#A8A29E', flexShrink: 0 }}>{node.sizeStandard}</span>
      )}
      <span
        style={{
          fontSize: 11,
          color: '#A8A29E',
          fontFamily: 'JetBrains Mono, Consolas, monospace',
          flexShrink: 0,
        }}
      >
        {fmtNum(node.count)}
      </span>
    </div>
  )
}

function NaicsGroupRow({
  node,
  depth,
}: {
  node: NaicsGroupNode
  depth: number
}) {
  const [expanded, setExpanded] = useState(node.expanded ?? false)
  if (!node.children) return null
  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingLeft: depth * 16 + 8,
          paddingTop: 5,
          paddingBottom: 5,
          paddingRight: 8,
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          borderRadius: 6,
        }}
      >
        <span style={{ fontSize: 10, color: '#A8A29E', width: 12, textAlign: 'center' }}>
          {expanded ? '▾' : '▸'}
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            fontSize: 11,
            color: '#A8A29E',
            flexShrink: 0,
            minWidth: 48,
          }}
        >
          {node.code}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1C1917', flex: 1 }}>{node.name}</span>
        <span
          style={{
            fontSize: 11,
            color: '#A8A29E',
            fontFamily: 'JetBrains Mono, Consolas, monospace',
          }}
        >
          {fmtNum(node.count)}
        </span>
      </button>
      {expanded && (
        <div>
          {node.children.map((child) =>
            isLeaf(child) ? (
              <NaicsLeafRow key={child.code} node={child as NaicsLeafNode} depth={depth + 1} />
            ) : (
              <NaicsGroupRow key={child.code} node={child as NaicsGroupNode} depth={depth + 1} />
            )
          )}
        </div>
      )}
    </div>
  )
}

function ChipToggle({
  label,
  active,
  onToggle,
}: {
  label: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        border: `1px solid ${active ? '#C7D2FE' : '#E7E5E4'}`,
        background: active ? '#EEF2FF' : '#FFFFFF',
        color: active ? '#4338CA' : '#57534E',
        transition: 'all 0.12s ease',
      }}
    >
      {active && <span style={{ fontSize: 10, lineHeight: 1 }}>✓</span>}
      {label}
    </button>
  )
}

// ─── Tab components ───────────────────────────────────────────────────────────

function CriteriaTab({ watch }: { watch: Watch }) {
  const [naicsSearch, setNaicsSearch] = useState('')
  const [selectedState, setSelectedState] = useState('FL')
  const [activeCounties, setActiveCounties] = useState<string[]>(watch.counties)
  const [activeEntityTypes, setActiveEntityTypes] = useState<string[]>(watch.entityType)
  const [ageMax, setAgeMax] = useState(watch.ageMax)
  const [signals, setSignals] = useState({
    emailAvailable: true,
    phoneAvailable: false,
    hasWebsite: false,
  })

  const allCounties = ['Miami-Dade', 'Broward', 'Palm Beach', 'Orange', 'Hillsborough', 'Pinellas', 'Duval', 'Lee', 'Sarasota', 'Collier']
  const entityTypes = ['LLC', 'Inc', 'PA', 'PLLC', 'Corp', 'LP', 'LLP', 'Sole Prop']

  const toggleCounty = (c: string) => {
    setActiveCounties((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  const toggleEntityType = (t: string) => {
    setActiveEntityTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      {/* Left: NAICS Tree */}
      <Card pad={0}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F5F5F4' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', marginBottom: 10 }}>NAICS Classification</div>
          <input
            value={naicsSearch}
            onChange={(e) => setNaicsSearch(e.target.value)}
            placeholder="Search code or keyword…"
            style={{
              width: '100%',
              padding: '7px 10px',
              fontSize: 12.5,
              border: '1px solid #E7E5E4',
              borderRadius: 8,
              outline: 'none',
              color: '#1C1917',
              background: '#FAFAF9',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ padding: '8px 4px', maxHeight: 420, overflowY: 'auto' }}>
          {NAICS_TREE.map((node) => (
            <NaicsGroupRow key={node.code} node={node as NaicsGroupNode} depth={0} />
          ))}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #F5F5F4', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm">Clear all</Button>
          <Button variant="secondary" size="sm">Save selection</Button>
        </div>
      </Card>

      {/* Right: Geography + Entity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Geography card */}
        <Card pad={16}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', marginBottom: 12 }}>Geography</div>

          <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>State</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {STATES.filter((s) => s.coverage === 'live').slice(0, 8).map((s) => (
              <ChipToggle
                key={s.code}
                label={s.code}
                active={selectedState === s.code}
                onToggle={() => setSelectedState(s.code)}
              />
            ))}
            <button
              style={{
                padding: '4px 10px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid #E7E5E4',
                background: '#FAFAF9',
                color: '#78716C',
              }}
            >
              +15 more
            </button>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>County / Metro area</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {allCounties.map((c) => (
              <ChipToggle
                key={c}
                label={c}
                active={activeCounties.includes(c)}
                onToggle={() => toggleCounty(c)}
              />
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>ZIP codes</div>
          <input
            defaultValue={watch.zips.join(', ')}
            placeholder="33131, 33132, …"
            style={{
              width: '100%',
              padding: '7px 10px',
              fontSize: 12.5,
              border: '1px solid #E7E5E4',
              borderRadius: 8,
              outline: 'none',
              color: '#1C1917',
              background: '#FAFAF9',
              boxSizing: 'border-box',
            }}
          />
        </Card>

        {/* Entity & Timing card */}
        <Card pad={16}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', marginBottom: 12 }}>Entity & Timing</div>

          <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Entity type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {entityTypes.map((t) => (
              <ChipToggle
                key={t}
                label={t}
                active={activeEntityTypes.includes(t)}
                onToggle={() => toggleEntityType(t)}
              />
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
            Business age (days since filing)
          </div>
          <div style={{ marginBottom: 8 }}>
            <input
              type="range"
              min={0}
              max={365}
              value={ageMax}
              onChange={(e) => setAgeMax(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#4F46E5' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#78716C', marginTop: 4 }}>
              <span>0 days</span>
              <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', color: '#4F46E5', fontWeight: 700 }}>
                ≤ {ageMax}d
              </span>
              <span>365 days</span>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10, marginTop: 8 }}>
            Signal filters
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(
              [
                { key: 'emailAvailable', label: 'Email available', desc: 'Clearbit / Apollo has email' },
                { key: 'phoneAvailable', label: 'Phone number found', desc: 'Any verified phone on record' },
                { key: 'hasWebsite', label: 'Has website', desc: 'Domain detected in registry or enrichment' },
              ] as const
            ).map(({ key, label, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Toggle checked={signals[key]} onChange={(v) => setSignals((s) => ({ ...s, [key]: v }))} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1C1917' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#A8A29E' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function LivePreviewTab({ matches }: { matches: Match[] }) {
  const autoApproveCount = matches.filter((m) => m.action === 'auto-approve').length
  const queueCount = matches.filter((m) => m.action === 'queue').length
  const dropCount = matches.filter((m) => m.action === 'drop').length

  return (
    <div>
      <Card pad={0}>
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 90px 110px 60px 80px 130px',
            gap: 0,
            padding: '10px 16px',
            borderBottom: '1px solid #F5F5F4',
            fontSize: 11,
            fontWeight: 600,
            color: '#A8A29E',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span>Entity</span>
          <span>NAICS</span>
          <span>County</span>
          <span>Age</span>
          <span>Score</span>
          <span>Action</span>
        </div>

        {/* Rows */}
        {matches.map((m, i) => (
          <div
            key={m.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 110px 60px 80px 130px',
              gap: 0,
              padding: '11px 16px',
              borderBottom: i < matches.length - 1 ? '1px solid #F5F5F4' : 'none',
              alignItems: 'center',
              background: m.current ? '#FAFAF9' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <LetterAvatar name={m.legalName} size={28} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#1C1917',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 180,
                    }}
                  >
                    {m.legalName}
                  </div>
                  {(m.award_amount ?? 0) > 0 ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#4338CA',
                        background: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        borderRadius: 4,
                        padding: '1px 5px',
                        letterSpacing: '0.03em',
                        flexShrink: 0,
                      }}
                    >
                      Prime
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#78716C',
                        background: '#F5F5F4',
                        border: '1px solid #E7E5E4',
                        borderRadius: 4,
                        padding: '1px 5px',
                        letterSpacing: '0.03em',
                        flexShrink: 0,
                      }}
                    >
                      New Entity
                    </span>
                  )}
                </div>
                {m.email && (
                  <div style={{ fontSize: 11, color: '#059669' }}>email available</div>
                )}
              </div>
            </div>
            <span
              style={{
                fontFamily: 'JetBrains Mono, Consolas, monospace',
                fontSize: 11.5,
                color: '#78716C',
              }}
            >
              {m.naics}
            </span>
            <span style={{ fontSize: 12.5, color: '#57534E' }}>{m.county}</span>
            <AgeBadge days={m.days} />
            <ScoreBadge score={m.predictedScore} />
            <ActionChip action={m.action} />
          </div>
        ))}

        {/* Summary footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #F5F5F4',
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            background: '#FAFAF9',
          }}
        >
          <span style={{ fontSize: 12, color: '#78716C' }}>
            <strong style={{ color: '#1C1917' }}>{matches.length}</strong> matches
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Chip tone="emerald" size="sm">{autoApproveCount} auto-approve</Chip>
            <Chip tone="amber" size="sm">{queueCount} queue</Chip>
            <Chip tone="neutral" size="sm">{dropCount} drop</Chip>
          </div>
        </div>
      </Card>
    </div>
  )
}

function AutomationTab({ watch }: { watch: Watch }) {
  const [killSwitches, setKillSwitches] = useState({
    pauseOnErrors: true,
    pauseOnBudget: false,
    requireApproval: false,
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      {/* Left: Pipeline steps */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', marginBottom: 14 }}>Pipeline steps</div>

        <PipelineBlock icon="📡" label="Source" detail={watch.sourceFreq} tone="indigo" />
        <PipelineConnector />
        <PipelineBlock icon="🔍" label="Enrich" detail={watch.enrichWith.join(' · ')} tone="indigo" />
        <PipelineConnector />
        <PipelineBlock icon="🤖" label="Score" detail={watch.scoreTemplate} tone="indigo" />
        <PipelineConnector />

        {/* Routing decision */}
        <div
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 10,
            padding: '12px 16px',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 10 }}>Routing decision</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, Consolas, monospace',
                  fontSize: 11,
                  color: '#059669',
                  fontWeight: 700,
                  minWidth: 40,
                }}
              >
                ≥{watch.autoApproveThreshold}
              </span>
              <Chip tone="emerald" size="sm">Auto-approve → Sequence</Chip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, Consolas, monospace',
                  fontSize: 11,
                  color: '#D97706',
                  fontWeight: 700,
                  minWidth: 40,
                }}
              >
                ≥{watch.queueThreshold}
              </span>
              <Chip tone="amber" size="sm">Queue → Human review</Chip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, Consolas, monospace',
                  fontSize: 11,
                  color: '#78716C',
                  fontWeight: 700,
                  minWidth: 40,
                }}
              >
                &lt;{watch.queueThreshold}
              </span>
              <Chip tone="neutral" size="sm">Drop → Archive</Chip>
            </div>
          </div>
        </div>

        <PipelineConnector />
        <PipelineBlock icon="✉️" label="Sequence" detail={watch.sequence} tone="emerald" />
        <PipelineConnector />
        <PipelineBlock icon="🔔" label="Notify" detail={watch.notifyChannel} tone="neutral" />
      </div>

      {/* Right: Config cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Routing rules */}
        <Card pad={16}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', marginBottom: 12 }}>Routing rules</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: '#A8A29E', marginBottom: 4 }}>Auto-approve threshold</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="range"
                  min={50}
                  max={99}
                  defaultValue={watch.autoApproveThreshold}
                  style={{ flex: 1, accentColor: '#059669' }}
                />
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, Consolas, monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#059669',
                    minWidth: 28,
                  }}
                >
                  {watch.autoApproveThreshold}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#A8A29E', marginBottom: 4 }}>Queue threshold</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="range"
                  min={30}
                  max={80}
                  defaultValue={watch.queueThreshold}
                  style={{ flex: 1, accentColor: '#D97706' }}
                />
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, Consolas, monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#D97706',
                    minWidth: 28,
                  }}
                >
                  {watch.queueThreshold}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Kill switches */}
        <Card pad={16}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', marginBottom: 12 }}>Kill switches</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(
              [
                { key: 'pauseOnErrors', label: 'Pause on errors', desc: 'Auto-pause if enrichment errors > 20%' },
                { key: 'pauseOnBudget', label: 'Pause on budget', desc: 'Stop sequence when daily budget hit' },
                { key: 'requireApproval', label: 'Require manual approval', desc: 'Override auto-approve — all go to queue' },
              ] as const
            ).map(({ key, label, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Toggle
                  checked={killSwitches[key]}
                  onChange={(v) => setKillSwitches((s) => ({ ...s, [key]: v }))}
                />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1C1917' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Run economics */}
        <Card pad={16}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', marginBottom: 12 }}>Run economics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Enrichment / record', value: '$0.04', tone: '#1C1917' },
              { label: 'Scoring / record', value: '$0.001', tone: '#1C1917' },
              { label: 'Est. cost per run', value: '~$0.42', tone: '#4F46E5' },
              { label: 'Est. cost per month', value: '~$12.60', tone: '#4F46E5' },
              { label: 'Cost per auto-approved lead', value: '~$0.39', tone: '#059669' },
            ].map(({ label, value, tone }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: '#78716C' }}>{label}</span>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, Consolas, monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    color: tone,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function RunHistoryTab() {
  const colStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#A8A29E',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }

  return (
    <Card pad={0}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '150px 120px 70px 70px 90px 70px 60px 60px 80px',
          gap: 0,
          padding: '10px 16px',
          borderBottom: '1px solid #F5F5F4',
        }}
      >
        <span style={colStyle}>Timestamp</span>
        <span style={colStyle}>Source</span>
        <span style={colStyle}>Matched</span>
        <span style={colStyle}>Scored</span>
        <span style={colStyle}>Auto-approved</span>
        <span style={colStyle}>Queued</span>
        <span style={colStyle}>Drop</span>
        <span style={colStyle}>Errors</span>
        <span style={colStyle}>Duration</span>
      </div>
      {RUN_HISTORY.map((r, i) => (
        <div
          key={r.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '150px 120px 70px 70px 90px 70px 60px 60px 80px',
            gap: 0,
            padding: '11px 16px',
            borderBottom: i < RUN_HISTORY.length - 1 ? '1px solid #F5F5F4' : 'none',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 12, color: '#78716C', fontFamily: 'JetBrains Mono, Consolas, monospace' }}>
            {relTime(r.ts)}
          </span>
          <span style={{ fontSize: 12.5, color: '#57534E' }}>{r.source}</span>
          <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 12, color: '#1C1917', fontWeight: 600 }}>
            {r.matched}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 12, color: '#1C1917' }}>
            {r.scored}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 12, color: '#4F46E5', fontWeight: 600 }}>
            {r.autoApproved}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 12, color: '#D97706' }}>
            {r.queued}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 12, color: '#78716C' }}>
            {r.dropped}
          </span>
          <span
            style={{
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              fontSize: 12,
              color: r.errors > 0 ? '#B91C1C' : '#A8A29E',
              fontWeight: r.errors > 0 ? 700 : 400,
            }}
          >
            {r.errors}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 11.5, color: '#78716C' }}>
            {fmtDuration(r.durationMs)}
          </span>
        </div>
      ))}
    </Card>
  )
}

// ─── Coverage Strip ───────────────────────────────────────────────────────────

function CoverageStrip() {
  const [expanded, setExpanded] = useState(false)
  const liveStates = STATES.filter((s) => s.coverage === 'live')
  const plannedStates = STATES.filter((s) => s.coverage === 'planned')
  const totalEntities = useMemo(() => liveStates.reduce((sum, s) => sum + s.entities, 0), [liveStates])

  return (
    <Card pad={0} style={{ marginBottom: 20 }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot tone="emerald" size={8} pulse />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1C1917' }}>
              {liveStates.length} states live
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot tone="amber" size={8} />
            <span style={{ fontSize: 12.5, color: '#78716C' }}>
              {plannedStates.length} planned
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#A8A29E' }}>·</span>
          <span style={{ fontSize: 12.5, color: '#78716C' }}>
            <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', color: '#1C1917', fontWeight: 600 }}>
              {fmtEntities(totalEntities)}
            </span>{' '}
            entities indexed
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#78716C' }}>{expanded ? '▲ Collapse' : '▼ Coverage map'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F5F5F4' }}>
          <div style={{ paddingTop: 14, marginBottom: 10, display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#4F46E5' }} />
              <span style={{ fontSize: 11.5, color: '#57534E' }}>Live</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#FFFBEB', border: '1px solid #FDE68A' }} />
              <span style={{ fontSize: 11.5, color: '#57534E' }}>Planned</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#F5F5F4', border: '1px solid #E7E5E4' }} />
              <span style={{ fontSize: 11.5, color: '#57534E' }}>Manual only</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STATES.map((s) => {
              const isLive = s.coverage === 'live'
              return (
                <div
                  key={s.code}
                  title={`${s.name}${s.registry ? ` · ${s.registry}` : ''} · ${fmtEntities(s.entities)} entities`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: isLive ? '#4F46E5' : '#FFFBEB',
                    border: `1px solid ${isLive ? '#4338CA' : '#FDE68A'}`,
                    cursor: 'default',
                  }}
                >
                  {s.primary && (
                    <span style={{ fontSize: 7, color: isLive ? '#C7D2FE' : '#D97706' }}>●</span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: isLive ? '#FFFFFF' : '#92400E',
                      fontFamily: 'JetBrains Mono, Consolas, monospace',
                    }}
                  >
                    {s.code}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface IntelWinner {
  id: string
  company: string
  state: string
  contract_value: number
  agency: string
  naics?: string
}

export default function DiscoveryPage() {
  const [activeWatchId, setActiveWatchId] = useState('w1')
  const [activeTab, setActiveTab] = useState<'criteria' | 'preview' | 'automation' | 'history'>('criteria')
  const [matches, setMatches] = useState<Match[]>(MATCHES)
  const [intelWinners, setIntelWinners] = useState<IntelWinner[]>([])
  const [intelLoading, setIntelLoading] = useState(true)
  const [targeted, setTargeted] = useState<Set<string>>(new Set())
  const [targeting, setTargeting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/discovery/matches')
      .then(r => r.json())
      .then(d => { if (d.matches?.length) setMatches(d.matches) })
      .catch(() => {})

    fetch('/api/intelligence/winners?limit=5')
      .then(r => r.json())
      .then(d => {
        const list = d.winners ?? d ?? []
        if (Array.isArray(list)) setIntelWinners(list.slice(0, 5))
      })
      .catch(() => {})
      .finally(() => setIntelLoading(false))
  }, [])

  async function targetWinner(winner: IntelWinner) {
    setTargeting(winner.id)
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: winner.company,
          agency: winner.agency,
          state: winner.state,
          status: 'New',
          source: 'intelligence',
          estimated_value: winner.contract_value,
          naics_codes: winner.naics ? [winner.naics] : [],
          signal_strength: winner.contract_value >= 500_000 ? 'High' : 'Medium',
        }),
      })
      setTargeted(prev => new Set([...prev, winner.id]))
    } catch {
      setTargeted(prev => new Set([...prev, winner.id]))
    } finally {
      setTargeting(null)
    }
  }

  function fmtVal(v: number): string {
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
    return `$${v}`
  }

  const activeWatch = useMemo(() => WATCHES.find((w) => w.id === activeWatchId) ?? WATCHES[0], [activeWatchId])

  const liveCount = STATES.filter((s) => s.coverage === 'live').length
  const totalEntities = useMemo(() => STATES.filter((s) => s.coverage === 'live').reduce((sum, s) => sum + s.entities, 0), [])

  const tabs: { id: typeof activeTab; label: string; badge?: number }[] = [
    { id: 'criteria', label: 'Criteria' },
    { id: 'preview', label: 'Live preview', badge: matches.length },
    { id: 'automation', label: 'Automation pipeline' },
    { id: 'history', label: 'Run history', badge: RUN_HISTORY.length },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <TopBar
        notifications={[]}
        onMarkAllRead={() => {}}
        onClickNotif={() => {}}
        onOpenCopilot={() => {}}
        onOpenCmdK={() => {}}
      />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 80px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#A8A29E',
                marginBottom: 6,
              }}
            >
              Lead discovery · nationwide
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1C1917', margin: 0, lineHeight: 1.2 }}>
              Discovery Studio
            </h1>
            <p style={{ fontSize: 13, color: '#78716C', margin: '6px 0 0', lineHeight: 1.5 }}>
              <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', color: '#4F46E5', fontWeight: 600 }}>
                {liveCount}
              </span>{' '}
              state registries live ·{' '}
              <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', color: '#1C1917', fontWeight: 600 }}>
                {fmtEntities(totalEntities)}
              </span>{' '}
              entities indexed · NAICS-driven, Claude-scored
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginTop: 4 }}>
            <span style={{ padding: '7px 14px', background: '#F5F5F4', border: '1px solid #E7E5E4', borderRadius: 8, fontSize: 13, color: '#A8A29E' }}>
              Saved searches — coming soon
            </span>
          </div>
        </div>

        {/* Coverage strip */}
        <CoverageStrip />

        {/* Live Intelligence Feed */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1917' }}>
                Contract Winners — Potential Clients
                {intelWinners.length > 0 && (
                  <span style={{
                    marginLeft: 8,
                    fontFamily: 'JetBrains Mono, Consolas, monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#4F46E5',
                    background: '#EEF2FF',
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}>
                    {intelWinners.length}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: '#78716C', marginTop: 2 }}>
                Government contract winners that need janitorial services — target as subcontracting clients
              </div>
            </div>
            <a
              href="/intelligence"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#4F46E5',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
              }}
            >
              View all in Intelligence →
            </a>
          </div>

          {intelLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: 52, background: '#FFFFFF', border: '1px solid #E7E5E4',
                  borderRadius: 10, opacity: 0.5,
                }} />
              ))}
            </div>
          ) : intelWinners.length === 0 ? (
            <div style={{
              padding: '20px 24px',
              background: '#FFFFFF',
              border: '1px solid #E7E5E4',
              borderRadius: 10,
              fontSize: 13,
              color: '#78716C',
              textAlign: 'center',
            }}>
              No contract winners loaded yet.{' '}
              <a href="/intelligence" style={{ color: '#4F46E5', textDecoration: 'none', fontWeight: 600 }}>
                Go to Intelligence
              </a>{' '}
              to sync national data.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {intelWinners.map(winner => (
                <div
                  key={winner.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 16px',
                    background: '#FFFFFF',
                    border: '1px solid #E7E5E4',
                    borderRadius: 10,
                  }}
                >
                  {/* Company name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); window.location.href = `/companies/${encodeURIComponent(winner.company)}` }}
                    >
                      {winner.company}
                    </span>
                  </div>

                  {/* State badge */}
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#F5F5F4',
                    color: '#57534E',
                    border: '1px solid #E7E5E4',
                    borderRadius: 4,
                    padding: '2px 6px',
                    flexShrink: 0,
                  }}>
                    {winner.state || '??'}
                  </span>

                  {/* Contract value */}
                  <span style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#4F46E5',
                    fontFamily: 'JetBrains Mono, Consolas, monospace',
                    flexShrink: 0,
                    minWidth: 60,
                    textAlign: 'right',
                  }}>
                    {fmtVal(winner.contract_value)}
                  </span>

                  {/* Agency (truncated) */}
                  <span style={{
                    fontSize: 11.5,
                    color: '#78716C',
                    flexShrink: 0,
                    maxWidth: 180,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {winner.agency}
                  </span>

                  {/* Target button */}
                  {targeted.has(winner.id) ? (
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: '#16A34A',
                      background: '#F0FDF4', border: '1px solid #BBF7D0',
                      borderRadius: 6, padding: '4px 10px', flexShrink: 0,
                    }}>
                      Added
                    </span>
                  ) : (
                    <button
                      onClick={() => targetWinner(winner)}
                      disabled={targeting === winner.id}
                      style={{
                        padding: '5px 12px',
                        background: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#4F46E5',
                        cursor: targeting === winner.id ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                        opacity: targeting === winner.id ? 0.6 : 1,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      }}
                    >
                      {targeting === winner.id ? 'Adding...' : 'Target'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watches bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.04em', textTransform: 'uppercase', marginRight: 4 }}>
            Watches
          </span>
          {WATCHES.map((w) => {
            const isActive = w.id === activeWatchId
            return (
              <button
                key={w.id}
                onClick={() => setActiveWatchId(w.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 14px',
                  borderRadius: 99,
                  fontSize: 12.5,
                  fontWeight: isActive ? 600 : 500,
                  border: isActive ? '1px solid #1C1917' : '1px solid #E7E5E4',
                  background: isActive ? '#1C1917' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#57534E',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                <StatusDot tone={w.active ? 'emerald' : 'neutral'} size={7} />
                {w.name}
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, Consolas, monospace',
                    fontSize: 10,
                    color: isActive ? '#A8A29E' : '#78716C',
                    background: isActive ? 'rgba(255,255,255,0.12)' : '#F5F5F4',
                    borderRadius: 4,
                    padding: '1px 5px',
                    marginLeft: 2,
                  }}
                >
                  {w.stats.matched7d}
                </span>
              </button>
            )
          })}
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 12px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 500,
              border: '1px dashed #D6D3D1',
              background: 'transparent',
              color: '#A8A29E',
              cursor: 'pointer',
            }}
          >
            + Add watch
          </button>
        </div>

        {/* Watch header card */}
        <Card pad={20} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
            {/* Icon */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              🔭
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1917', margin: 0 }}>
                  {activeWatch.name}
                </h2>
                <Chip tone={activeWatch.active ? 'emerald' : 'neutral'} size="sm">
                  {activeWatch.active ? 'Active' : 'Paused'}
                </Chip>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#78716C' }}>
                  Owner:{' '}
                  <span style={{ fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 11.5, color: '#1C1917' }}>
                    {activeWatch.owner}
                  </span>
                </span>
                <span style={{ fontSize: 12, color: '#78716C' }}>
                  Last run:{' '}
                  <span style={{ color: '#1C1917' }}>{relTime(activeWatch.lastRun)}</span>
                </span>
                <span style={{ fontSize: 12, color: '#78716C' }}>
                  Schedule:{' '}
                  <span style={{ color: '#1C1917' }}>{activeWatch.sourceFreq}</span>
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Button variant="ghost" size="sm">Edit</Button>
              <Button variant="secondary" size="sm">▶ Run now</Button>
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              background: '#FAFAF9',
              border: '1px solid #F0EEEC',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            {[
              { label: 'Matched · 7d', value: activeWatch.stats.matched7d },
              { label: 'Scored', value: activeWatch.stats.scored7d },
              { label: 'Auto-approved', value: activeWatch.stats.autoApproved, tone: 'indigo' as const },
              { label: 'Queued', value: activeWatch.stats.queued, tone: 'amber' as const },
              { label: 'Dropped', value: activeWatch.stats.dropped, tone: 'neutral' as const },
              { label: 'Closed won', value: activeWatch.stats.won, tone: 'emerald' as const },
            ].map((stat, i, arr) => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  padding: '16px 12px',
                  borderRight: i < arr.length - 1 ? '1px solid #F0EEEC' : 'none',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <WatchStat label={stat.label} value={stat.value} tone={stat.tone} />
              </div>
            ))}
          </div>
        </Card>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            borderBottom: '1px solid #E7E5E4',
            marginBottom: 24,
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1C1917' : '#78716C',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? '#4F46E5' : 'transparent'}`,
                  cursor: 'pointer',
                  marginBottom: -1,
                  transition: 'color 0.12s ease',
                }}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, Consolas, monospace',
                      fontSize: 10,
                      fontWeight: 600,
                      color: isActive ? '#4F46E5' : '#A8A29E',
                      background: isActive ? '#EEF2FF' : '#F5F5F4',
                      borderRadius: 4,
                      padding: '2px 5px',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'criteria' && <CriteriaTab watch={activeWatch} />}
        {activeTab === 'preview' && <LivePreviewTab matches={matches} />}
        {activeTab === 'automation' && <AutomationTab watch={activeWatch} />}
        {activeTab === 'history' && <RunHistoryTab />}
      </div>
    </div>
  )
}
