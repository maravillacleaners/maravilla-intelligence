'use client'

import React, { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/crm/top-bar'

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  accent: '#3B82F6', accentLight: '#EFF6FF', accentBorder: '#BFDBFE',
  green: '#16A34A', greenLight: '#F0FDF4', greenBorder: '#BBF7D0',
  red: '#DC2626', redLight: '#FEF2F2', redBorder: '#FECACA',
  amber: '#D97706', amberLight: '#FFFBEB', amberBorder: '#FDE68A',
  purple: '#7C3AED', purpleLight: '#F5F3FF', purpleBorder: '#DDD6FE',
  teal: '#0D9488', tealLight: '#F0FDFA', tealBorder: '#99F6E4',
  text: '#1C1917', muted: '#78716C', border: '#E7E5E4',
  bg: '#FAFAF9', card: '#FFFFFF', surface: '#F5F5F4',
}

const FF = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'Open' | 'In Progress' | 'Done' | 'Blocked'
type TaskPriority = 'High' | 'Medium' | 'Low'
type EntityType = 'Company' | 'Agency' | 'Contract' | 'Opportunity'

interface Task {
  id: string
  task: string
  status: TaskStatus
  priority: TaskPriority
  entity_type: EntityType | ''
  entity_name: string
  entity_url: string
  owner: string
  due_date: string | null
  notes: string
  created_at: string
}

interface FormData {
  task: string
  status: TaskStatus
  priority: TaskPriority
  entity_type: EntityType | ''
  entity_name: string
  entity_url: string
  owner: string
  due_date: string
  notes: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES: TaskStatus[] = ['Open', 'In Progress', 'Done', 'Blocked']
const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low']
const ENTITY_TYPES: (EntityType | '')[] = ['', 'Company', 'Agency', 'Contract', 'Opportunity']

const BLANK_FORM: FormData = {
  task: '', status: 'Open', priority: 'Medium',
  entity_type: '', entity_name: '', entity_url: '',
  owner: '', due_date: '', notes: '',
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function priorityColors(p: string): { bg: string; color: string; border: string } {
  if (p === 'High') return { bg: C.redLight, color: C.red, border: C.redBorder }
  if (p === 'Medium') return { bg: C.amberLight, color: C.amber, border: C.amberBorder }
  return { bg: C.surface, color: C.muted, border: C.border }
}

function entityColors(t: string): { bg: string; color: string; border: string } {
  if (t === 'Company') return { bg: C.accentLight, color: C.accent, border: C.accentBorder }
  if (t === 'Agency') return { bg: C.purpleLight, color: C.purple, border: C.purpleBorder }
  if (t === 'Contract') return { bg: C.tealLight, color: C.teal, border: C.tealBorder }
  return { bg: C.greenLight, color: C.green, border: C.greenBorder }
}

function statusColors(s: string): { bg: string; color: string; border: string } {
  if (s === 'Open') return { bg: C.accentLight, color: C.accent, border: C.accentBorder }
  if (s === 'In Progress') return { bg: C.amberLight, color: C.amber, border: C.amberBorder }
  if (s === 'Done') return { bg: C.greenLight, color: C.green, border: C.greenBorder }
  if (s === 'Blocked') return { bg: C.redLight, color: C.red, border: C.redBorder }
  return { bg: C.surface, color: C.muted, border: C.border }
}

function dueDateStyle(due: string | null): React.CSSProperties {
  if (!due) return { color: C.muted }
  const d = new Date(due)
  const now = new Date()
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return { color: C.red, fontWeight: 600 }
  if (diff < 7) return { color: C.amber, fontWeight: 600 }
  return { color: C.muted }
}

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ownerInitial(owner: string): string {
  return owner ? owner.trim()[0].toUpperCase() : '?'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, bg, color, border }: { label: string; bg: string; color: string; border: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: bg, color, border: `1px solid ${border}`,
      letterSpacing: 0.3,
    }}>
      {label}
    </span>
  )
}

function OwnerChip({ owner }: { owner: string }) {
  if (!owner) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: C.accent, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>
        {ownerInitial(owner)}
      </span>
      <span style={{ fontSize: 12, color: C.muted }}>{owner}</span>
    </span>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ tasks }: { tasks: Task[] }) {
  const counts = {
    total: tasks.length,
    open: tasks.filter(t => t.status === 'Open').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    done: tasks.filter(t => t.status === 'Done').length,
    blocked: tasks.filter(t => t.status === 'Blocked').length,
  }

  const chips: { label: string; value: number; color: string; bg: string }[] = [
    { label: 'Total', value: counts.total, color: C.text, bg: C.surface },
    { label: 'Open', value: counts.open, color: C.accent, bg: C.accentLight },
    { label: 'In Progress', value: counts.inProgress, color: C.amber, bg: C.amberLight },
    { label: 'Done', value: counts.done, color: C.green, bg: C.greenLight },
    { label: 'Blocked', value: counts.blocked, color: C.red, bg: C.redLight },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
      {chips.map(ch => (
        <div key={ch.label} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: ch.bg, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '8px 14px',
        }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: ch.color, lineHeight: 1 }}>
            {ch.value}
          </span>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>
            {ch.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  statusFilter: TaskStatus | 'All'
  setStatusFilter: (s: TaskStatus | 'All') => void
  priorityFilter: TaskPriority | 'All'
  setPriorityFilter: (p: TaskPriority | 'All') => void
  entityFilter: EntityType | 'All'
  setEntityFilter: (e: EntityType | 'All') => void
  tasks: Task[]
}

function FilterBar({
  statusFilter, setStatusFilter,
  priorityFilter, setPriorityFilter,
  entityFilter, setEntityFilter,
  tasks,
}: FilterBarProps) {
  const statusCount = (s: TaskStatus | 'All') =>
    s === 'All' ? tasks.length : tasks.filter(t => t.status === s).length

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '12px 16px', marginBottom: 20,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginRight: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</span>
        {(['All', ...STATUSES] as (TaskStatus | 'All')[]).map(s => {
          const active = statusFilter === s
          const sc = s !== 'All' ? statusColors(s) : { bg: C.surface, color: C.text, border: C.border }
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: `1px solid ${active ? sc.border : C.border}`,
                background: active ? sc.bg : C.card, color: active ? sc.color : C.muted,
                transition: 'all 0.15s',
              }}
            >
              {s} <span style={{ opacity: 0.7 }}>({statusCount(s)})</span>
            </button>
          )
        })}
      </div>

      {/* Priority + Entity row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Priority chips */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginRight: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Priority</span>
          {(['All', ...PRIORITIES] as (TaskPriority | 'All')[]).map(p => {
            const active = priorityFilter === p
            const pc = p !== 'All' ? priorityColors(p) : { bg: C.surface, color: C.text, border: C.border }
            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: `1px solid ${active ? pc.border : C.border}`,
                  background: active ? pc.bg : C.card, color: active ? pc.color : C.muted,
                  transition: 'all 0.15s',
                }}
              >
                {p}
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: C.border }} />

        {/* Entity type */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginRight: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entity</span>
          {(['All', 'Company', 'Agency', 'Contract'] as (EntityType | 'All')[]).map(e => {
            const active = entityFilter === e
            const ec = e !== 'All' ? entityColors(e) : { bg: C.surface, color: C.text, border: C.border }
            return (
              <button
                key={e}
                onClick={() => setEntityFilter(e)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: `1px solid ${active ? ec.border : C.border}`,
                  background: active ? ec.bg : C.card, color: active ? ec.color : C.muted,
                  transition: 'all 0.15s',
                }}
              >
                {e}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  onStatusChange: (id: string, status: TaskStatus) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

function TaskCard({ task, onStatusChange, onEdit, onDelete }: TaskCardProps) {
  const pc = priorityColors(task.priority)
  const ec = task.entity_type ? entityColors(task.entity_type) : null
  const dStyle = dueDateStyle(task.due_date)

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Top row: task name + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          flex: 1, fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.4,
        }}>
          {task.task}
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(task)}
            style={{
              padding: '3px 8px', borderRadius: 5, fontSize: 12,
              border: `1px solid ${C.border}`, background: C.surface,
              color: C.muted, cursor: 'pointer', fontFamily: FF,
            }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(task.id)}
            style={{
              padding: '3px 8px', borderRadius: 5, fontSize: 12,
              border: `1px solid ${C.redBorder}`, background: C.redLight,
              color: C.red, cursor: 'pointer', fontFamily: FF,
            }}
          >
            Del
          </button>
        </div>
      </div>

      {/* Entity + Priority badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {ec && task.entity_name && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
            background: ec.bg, color: ec.color, border: `1px solid ${ec.border}`,
          }}>
            {task.entity_type}
            {task.entity_url ? (
              <a
                href={task.entity_url}
                target="_blank"
                rel="noreferrer"
                style={{ color: ec.color, textDecoration: 'underline', marginLeft: 2 }}
              >
                {task.entity_name}
              </a>
            ) : (
              <span style={{ marginLeft: 2, fontWeight: 400 }}>{task.entity_name}</span>
            )}
          </span>
        )}
        <Badge label={task.priority} bg={pc.bg} color={pc.color} border={pc.border} />
      </div>

      {/* Bottom row: owner, due date, status select */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        flexWrap: 'wrap', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {task.owner && <OwnerChip owner={task.owner} />}
          {task.due_date && (
            <span style={{ fontSize: 12, ...dStyle }}>
              Due {formatDate(task.due_date)}
            </span>
          )}
        </div>
        <select
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value as TaskStatus)}
          style={{
            padding: '3px 6px', borderRadius: 5, fontSize: 12, fontWeight: 600,
            border: `1px solid ${statusColors(task.status).border}`,
            background: statusColors(task.status).bg,
            color: statusColors(task.status).color,
            cursor: 'pointer', fontFamily: FF, outline: 'none',
          }}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
  onSave: () => void
  onClose: () => void
  saving: boolean
  editId: string | null
}

function TaskModal({ form, setForm, onSave, onClose, saving, editId }: ModalProps) {
  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 14,
    border: `1px solid ${C.border}`, background: C.card, color: C.text,
    fontFamily: FF, outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: 0.4, display: 'block',
  }

  function field(
    label: string,
    key: keyof FormData,
    type: 'text' | 'date' | 'select' | 'textarea',
    options?: string[]
  ) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 14 }}>
        <label style={lbl}>{label}</label>
        {type === 'textarea' ? (
          <textarea
            value={form[key] as string}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            rows={3}
            style={{ ...inp, resize: 'vertical' }}
          />
        ) : type === 'select' ? (
          <select
            value={form[key] as string}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            style={{ ...inp }}
          >
            {options!.map(o => <option key={o} value={o}>{o || '— None —'}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={form[key] as string}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            style={inp}
            placeholder={label}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: C.card, borderRadius: 12, width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            {editId ? 'Edit Task' : 'New Task'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 20,
              color: C.muted, cursor: 'pointer', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: '16px 20px 20px' }}>
          {field('Task Name *', 'task', 'text')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {field('Status', 'status', 'select', STATUSES)}
            </div>
            <div>
              {field('Priority', 'priority', 'select', PRIORITIES)}
            </div>
          </div>
          {field('Entity Type', 'entity_type', 'select', ENTITY_TYPES as string[])}
          {field('Entity Name', 'entity_name', 'text')}
          {field('Entity URL', 'entity_url', 'text')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>{field('Owner', 'owner', 'text')}</div>
            <div>{field('Due Date', 'due_date', 'date')}</div>
          </div>
          {field('Notes', 'notes', 'textarea')}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: 7, fontSize: 14, fontWeight: 600,
                border: `1px solid ${C.border}`, background: C.surface,
                color: C.muted, cursor: 'pointer', fontFamily: FF,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving || !form.task.trim()}
              style={{
                padding: '8px 18px', borderRadius: 7, fontSize: 14, fontWeight: 600,
                border: 'none', background: !form.task.trim() ? C.surface : C.accent,
                color: !form.task.trim() ? C.muted : '#fff',
                cursor: !form.task.trim() ? 'not-allowed' : 'pointer',
                fontFamily: FF, opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '64px 24px', gap: 16, background: C.card,
      border: `1px solid ${C.border}`, borderRadius: 12,
    }}>
      <div style={{ fontSize: 40 }}>📋</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>No tasks yet</div>
      <div style={{ fontSize: 14, color: C.muted, textAlign: 'center', maxWidth: 380 }}>
        Create your first task from any Company, Agency, or Contract profile,
        or click below to add one manually.
      </div>
      <button
        onClick={onNew}
        style={{
          padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
          border: 'none', background: C.accent, color: '#fff',
          cursor: 'pointer', fontFamily: FF,
        }}
      >
        + New Task
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'All'>('All')
  const [entityFilter, setEntityFilter] = useState<EntityType | 'All'>('All')

  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'All') params.set('status', statusFilter)
      if (entityFilter !== 'All') params.set('entity_type', entityFilter)
      const res = await fetch(`/api/tasks?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { tasks: Task[] }
      setTasks(data.tasks || [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, entityFilter])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = tasks.filter(t => {
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false
    return true
  })

  // Group by status for display
  const grouped: Record<TaskStatus, Task[]> = {
    'Open': [], 'In Progress': [], 'Done': [], 'Blocked': [],
  }
  filtered.forEach(t => {
    const key = t.status as TaskStatus
    if (grouped[key]) grouped[key].push(t)
  })

  // ── Actions ────────────────────────────────────────────────────────────────

  function openNew() {
    setEditId(null)
    setForm(BLANK_FORM)
    setShowModal(true)
  }

  function openEdit(task: Task) {
    setEditId(task.id)
    setForm({
      task: task.task,
      status: task.status,
      priority: task.priority,
      entity_type: task.entity_type,
      entity_name: task.entity_name,
      entity_url: task.entity_url,
      owner: task.owner,
      due_date: task.due_date || '',
      notes: task.notes,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.task.trim()) return
    setSaving(true)
    try {
      const body = {
        task: form.task.trim(),
        status: form.status,
        priority: form.priority,
        entity_type: form.entity_type || undefined,
        entity_name: form.entity_name || undefined,
        entity_url: form.entity_url || undefined,
        owner: form.owner || undefined,
        due_date: form.due_date || undefined,
        notes: form.notes || undefined,
      }

      if (editId) {
        await fetch(`/api/tasks/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      setShowModal(false)
      setEditId(null)
      setForm(BLANK_FORM)
      await fetchTasks()
    } catch (e) {
      console.error('[save task]', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch (e) {
      console.error('[status change]', e)
      await fetchTasks()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return
    // Optimistic remove
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    } catch (e) {
      console.error('[delete task]', e)
      await fetchTasks()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const statusOrder: TaskStatus[] = ['Open', 'In Progress', 'Blocked', 'Done']
  const visibleGroups = statusFilter === 'All'
    ? statusOrder
    : [statusFilter as TaskStatus]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FF }}>
      <TopBar screen="Tasks" notifications={notifs} onMarkAllRead={() => setNotifs([])} onClickNotif={() => {}} onOpenCopilot={() => {}} onOpenCmdK={() => {}} />
      {/* Header */}
      <div style={{
        background: C.card, borderBottom: `1px solid ${C.border}`,
        padding: '16px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>
            Task Engine
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: C.muted }}>
            Track work across companies, agencies, and contracts
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            border: 'none', background: C.accent, color: '#fff',
            cursor: 'pointer', fontFamily: FF,
            boxShadow: '0 1px 4px rgba(59,130,246,0.3)',
          }}
        >
          + New Task
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Stats bar */}
        <StatsBar tasks={tasks} />

        {/* Filter bar */}
        <FilterBar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          entityFilter={entityFilter}
          setEntityFilter={setEntityFilter}
          tasks={tasks}
        />

        {/* Content */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted, fontSize: 14 }}>
            Loading tasks…
          </div>
        )}

        {error && !loading && (
          <div style={{
            padding: '14px 16px', borderRadius: 8,
            background: C.redLight, border: `1px solid ${C.redBorder}`,
            color: C.red, fontSize: 14, marginBottom: 16,
          }}>
            Error loading tasks: {error}. <button onClick={fetchTasks} style={{ color: C.red, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>Retry</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState onNew={openNew} />
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {visibleGroups.map(status => {
              const group = grouped[status]
              if (group.length === 0) return null
              const sc = statusColors(status)
              return (
                <div key={status}>
                  {/* Group header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                  }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: sc.color,
                      background: sc.bg, border: `1px solid ${sc.border}`,
                      padding: '2px 10px', borderRadius: 20,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {status}
                    </span>
                    <span style={{ fontSize: 12, color: C.muted }}>
                      {group.length} task{group.length !== 1 ? 's' : ''}
                    </span>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                  </div>

                  {/* Task cards grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 10,
                  }}>
                    {group.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <TaskModal
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditId(null); setForm(BLANK_FORM) }}
          saving={saving}
          editId={editId}
        />
      )}
    </div>
  )
}
