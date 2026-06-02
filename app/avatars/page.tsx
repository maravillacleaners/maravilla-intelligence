'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import TopBar from '@/components/crm/top-bar'

const C = {
  bg: '#FAFAF9', surface: '#FFFFFF', border: '#E7E5E4',
  text: '#1C1917', muted: '#78716C', xmuted: '#A8A29E',
  indigo: '#4F46E5', indigoBg: '#EEF2FF',
  green: '#059669', greenBg: '#ECFDF5',
  amber: '#D97706', amberBg: '#FFFBEB',
  blue: '#2563EB', blueBg: '#EFF6FF',
}

const ZONE_COLORS: Record<string, string> = {
  downtown: '#2012f4',
  'coral-way': '#612bf2',
  biscayne: '#00c9d7',
  'coral-gables': '#0b0655',
  doral: '#f9a000',
  'little-havana': '#e0457b',
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
}

interface Toast {
  msg: string
  ok: boolean
}

function AvatarMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<Map<string, L.Marker>>(new Map())
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    zone: 'downtown',
    latitude: 25.77,
    longitude: -80.19,
    building_address: '',
    organization: '',
    decision_maker: '',
    approach_mode: 'cold_knock',
  })
  const router = useRouter()

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = L.map(mapContainer.current).setView([25.785, -80.21], 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map.current)

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Fetch avatars
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const res = await fetch('/api/avatars')
        const data = await res.json()
        if (data.ok) {
          setAvatars(data.avatars || [])
        }
      } catch (err) {
        console.error(err)
        showToast('Failed to load avatars', false)
      } finally {
        setLoading(false)
      }
    }
    fetchAvatars()
  }, [])

  // Update markers on map when avatars change
  useEffect(() => {
    if (!map.current) return

    // Clear old markers
    markers.current.forEach(marker => marker.remove())
    markers.current.clear()

    // Add new markers
    avatars.forEach(avatar => {
      if (avatar.latitude !== null && avatar.longitude !== null) {
        const color = ZONE_COLORS[avatar.zone.toLowerCase()] || '#999999'
        const marker = L.circleMarker([avatar.latitude, avatar.longitude], {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.92,
        })
          .addTo(map.current!)
          .bindPopup(
            `<div style="font-family:Inter,sans-serif;font-size:12px;min-width:200px">
              <b style="color:${color}">${avatar.zone}</b> · <span style="font-weight:600">${avatar.name}</span>
              <div style="line-height:1.4;margin-top:3px;color:#555">${avatar.building_address}</div>
              <div style="margin-top:6px;font-size:11px;color:#888">${avatar.approach_mode}</div>
              <button onclick="window.location.href='/avatars/${avatar.id}'" style="margin-top:8px;padding:4px 8px;background:#2563EB;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px">
                View Details
              </button>
            </div>`
          )
          .on('click', () => setSelectedId(avatar.id))

        markers.current.set(avatar.id, marker)
      }
    })
  }, [avatars, map.current])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreateAvatar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type: 'building',
          latitude: parseFloat(String(formData.latitude)),
          longitude: parseFloat(String(formData.longitude)),
        }),
      })

      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      setAvatars([...avatars, data.avatar])
      setFormData({
        name: '',
        zone: 'downtown',
        latitude: 25.77,
        longitude: -80.19,
        building_address: '',
        organization: '',
        decision_maker: '',
        approach_mode: 'cold_knock',
      })
      setShowForm(false)
      showToast('Avatar created', true)
    } catch (err) {
      showToast(String(err), false)
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <TopBar />

      <div style={{ maxWidth: '100%', padding: '24px' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.text }}>Avatar Map</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 16px',
              background: C.blue,
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {showForm ? '✕ Close' : '+ New Avatar'}
          </button>
        </div>

        {showForm && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <form onSubmit={handleCreateAvatar} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input
                placeholder="Building name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14 }}
                required
              />
              <select
                value={formData.zone}
                onChange={e => setFormData({ ...formData, zone: e.target.value })}
                style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14 }}
              >
                {Object.keys(ZONE_COLORS).map(z => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Latitude"
                step="0.0001"
                value={formData.latitude}
                onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14 }}
              />
              <input
                type="number"
                placeholder="Longitude"
                step="0.0001"
                value={formData.longitude}
                onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14 }}
              />
              <input
                placeholder="Building address"
                value={formData.building_address}
                onChange={e => setFormData({ ...formData, building_address: e.target.value })}
                style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14 }}
              />
              <input
                placeholder="Organization"
                value={formData.organization}
                onChange={e => setFormData({ ...formData, organization: e.target.value })}
                style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14 }}
              />
              <input
                placeholder="Decision maker"
                value={formData.decision_maker}
                onChange={e => setFormData({ ...formData, decision_maker: e.target.value })}
                style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14 }}
              />
              <select
                value={formData.approach_mode}
                onChange={e => setFormData({ ...formData, approach_mode: e.target.value })}
                style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14 }}
              >
                {APPROACH_MODES.map(m => (
                  <option key={m} value={m}>
                    {m.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  background: C.green,
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  gridColumn: '1 / -1',
                }}
              >
                Create Avatar
              </button>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
          <div
            ref={mapContainer}
            style={{
              height: '600px',
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              overflow: 'hidden',
            }}
          />

          {selectedId && avatars.find(a => a.id === selectedId) && (
            <AvatarSidebar
              avatar={avatars.find(a => a.id === selectedId)!}
              onClose={() => setSelectedId(null)}
              onNavigate={() => router.push(`/avatars/${selectedId}`)}
            />
          )}
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 72,
            right: 20,
            background: toast.ok ? C.greenBg : '#FEF2F2',
            color: toast.ok ? C.green : '#DC2626',
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

function AvatarSidebar({
  avatar,
  onClose,
  onNavigate,
}: {
  avatar: Avatar
  onClose: () => void
  onNavigate: () => void
}) {
  const color = ZONE_COLORS[avatar.zone.toLowerCase()] || '#999999'

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 16,
        height: 'fit-content',
        position: 'sticky',
        top: 100,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'none',
          border: 'none',
          fontSize: 20,
          cursor: 'pointer',
          color: C.muted,
        }}
      >
        ✕
      </button>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Zone</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginTop: 4 }}>{avatar.zone}</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Building</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>{avatar.name}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{avatar.building_address}</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Organization</div>
        <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{avatar.organization || 'N/A'}</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Decision Maker</div>
        <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{avatar.decision_maker || 'Unknown'}</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Approach</div>
        <div
          style={{
            display: 'inline-block',
            fontSize: 11,
            background: C.amberBg,
            color: C.amber,
            padding: '2px 8px',
            borderRadius: 10,
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          {avatar.approach_mode.replace(/_/g, ' ')}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Pipeline</div>
        <div
          style={{
            display: 'inline-block',
            fontSize: 11,
            background: C.blueBg,
            color: C.blue,
            padding: '2px 8px',
            borderRadius: 10,
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          {avatar.pipeline_status}
        </div>
      </div>

      {avatar.notes && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Notes</div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 4, lineHeight: 1.4 }}>{avatar.notes}</div>
        </div>
      )}

      <button
        onClick={onNavigate}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: C.blue,
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        View Details
      </button>
    </div>
  )
}

export default AvatarMap
