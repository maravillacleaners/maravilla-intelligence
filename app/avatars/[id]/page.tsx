'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopBar from '@/components/crm/top-bar'

const C = {
  bg: '#FAFAF9', surface: '#FFFFFF', border: '#E7E5E4',
  text: '#1C1917', muted: '#78716C', xmuted: '#A8A29E',
  indigo: '#4F46E5', indigoBg: '#EEF2FF',
  green: '#059669', greenBg: '#ECFDF5',
  amber: '#D97706', amberBg: '#FFFBEB',
  blue: '#2563EB', blueBg: '#EFF6FF',
  red: '#DC2626', redBg: '#FEF2F2',
}

const PIPELINE_STAGES = ['prospect', 'ready', 'contacted', 'meeting', 'proposal', 'won']
const APPROACH_MODES = ['cold_knock', 'on_site_management', 'call_first']

interface Avatar {
  id: string
  name: string
  type: string
  pipeline_status: string
  approach_mode: string
  zone: string
  latitude: number | null
  longitude: number | null
  building_address: string
  organization: string
  decision_maker: string
  connections: any[]
  notes: string
  created_time: string
}

interface Toast {
  msg: string
  ok: boolean
}

function AvatarDetail() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [avatar, setAvatar] = useState<Avatar | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const res = await fetch(`/api/avatars/${params.id}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setAvatar(data.avatar)
      } catch (err) {
        showToast('Failed to load avatar', false)
        router.push('/avatars')
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchAvatar()
  }, [params.id, router])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUpdate = async (field: string, value: any) => {
    if (!avatar) return
    try {
      const res = await fetch(`/api/avatars/${avatar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error('Update failed')
      const data = await res.json()
      setAvatar(data.avatar)
      setEditing(null)
      showToast('Updated', true)
    } catch (err) {
      showToast(String(err), false)
    }
  }

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted }}>Loading...</div>
      </div>
    )
  }

  if (!avatar) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted }}>Avatar not found</div>
      </div>
    )
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <TopBar />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.muted }}>
          <button
            onClick={() => router.push('/avatars')}
            style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', textDecoration: 'none' }}
          >
            ← Avatars
          </button>
          <span>/</span>
          <span style={{ color: C.text, fontWeight: 600 }}>{avatar.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          {/* Main Content */}
          <div>
            {/* Header */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
              <h1 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 700, color: C.text }}>{avatar.name}</h1>
              <p style={{ margin: 0, fontSize: 14, color: C.muted }}>{avatar.building_address}</p>

              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    background: '#F5F3FF',
                    color: '#7C3AED',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {avatar.zone}
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    background: C.amberBg,
                    color: C.amber,
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                >
                  {avatar.approach_mode.replace(/_/g, ' ')}
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    background: C.blueBg,
                    color: C.blue,
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                >
                  {avatar.pipeline_status}
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Organization */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>
                  Organization
                </div>
                {editing === 'organization' ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => handleUpdate('organization', editValue)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleUpdate('organization', editValue)
                      if (e.key === 'Escape') setEditing(null)
                    }}
                    style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14 }}
                  />
                ) : (
                  <div
                    onClick={() => {
                      setEditing('organization')
                      setEditValue(avatar.organization)
                    }}
                    style={{ fontSize: 14, color: C.text, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}
                  >
                    {avatar.organization || '+ Add'}
                  </div>
                )}
              </div>

              {/* Decision Maker */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>
                  Decision Maker
                </div>
                {editing === 'decision_maker' ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => handleUpdate('decision_maker', editValue)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleUpdate('decision_maker', editValue)
                      if (e.key === 'Escape') setEditing(null)
                    }}
                    style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14 }}
                  />
                ) : (
                  <div
                    onClick={() => {
                      setEditing('decision_maker')
                      setEditValue(avatar.decision_maker)
                    }}
                    style={{ fontSize: 14, color: C.text, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}
                  >
                    {avatar.decision_maker || '+ Add'}
                  </div>
                )}
              </div>

              {/* Pipeline Status */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>
                  Pipeline Status
                </div>
                <select
                  value={avatar.pipeline_status}
                  onChange={e => handleUpdate('pipeline_status', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {PIPELINE_STAGES.map(stage => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              {/* Approach Mode */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>
                  Approach Mode
                </div>
                <select
                  value={avatar.approach_mode}
                  onChange={e => handleUpdate('approach_mode', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {APPROACH_MODES.map(mode => (
                    <option key={mode} value={mode}>
                      {mode.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>
                Notes
              </div>
              <textarea
                value={avatar.notes}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => handleUpdate('notes', editValue)}
                placeholder="Add notes about this building..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  fontSize: 14,
                  minHeight: 120,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ height: 'fit-content', position: 'sticky', top: 100 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', marginBottom: 12 }}>
                Location
              </div>
              <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>
                <span style={{ color: C.muted }}>Lat:</span> {avatar.latitude?.toFixed(4)}
              </div>
              <div style={{ fontSize: 13, color: C.text, marginBottom: 12 }}>
                <span style={{ color: C.muted }}>Lng:</span> {avatar.longitude?.toFixed(4)}
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 }}>
                Connections
              </div>
              <div style={{ fontSize: 13, color: C.text }}>
                {avatar.connections?.length > 0 ? `${avatar.connections.length} connected` : 'No connections'}
              </div>

              <button
                onClick={() => router.push('/avatars')}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: '8px 12px',
                  background: C.indigo,
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Back to Map
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 72,
            right: 20,
            background: toast.ok ? C.greenBg : C.redBg,
            color: toast.ok ? C.green : C.red,
            border: `1px solid ${toast.ok ? '#A7F3D0' : '#FECACA'}`,
            padding: '12px 16px',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            zIndex: 9999,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

export default AvatarDetail
