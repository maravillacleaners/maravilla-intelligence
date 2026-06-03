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

export function AvatarMap() {
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

  useEffect(() => {
    if (!map.current) return

    markers.current.forEach(marker => marker.remove())
    markers.current.clear()

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
  }, [avatars])

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
              background: C.indigo,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            {showForm ? 'Cancel' : '+ New Avatar'}
          </button>
        </div>

        {showForm && (
          <div style={{ marginBottom: 24, padding: '16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Create Avatar</h2>
            <form onSubmit={handleCreateAvatar} style={{ display: 'grid', gap: '12px' }}>
              <input
                placeholder="Name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${C.border}`,
                  borderRadius: '6px',
                  fontSize: 14,
                }}
              />
              <select
                value={formData.zone}
                onChange={e => setFormData({ ...formData, zone: e.target.value })}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${C.border}`,
                  borderRadius: '6px',
                  fontSize: 14,
                }}
              >
                {Object.keys(ZONE_COLORS).map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <button type="submit" style={{ padding: '8px 16px', background: C.green, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                Create
              </button>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', height: '600px' }}>
          <div
            ref={mapContainer}
            style={{
              borderRadius: '8px',
              overflow: 'hidden',
              border: `1px solid ${C.border}`,
            }}
          />
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'auto', padding: '12px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: C.text }}>
              Avatars ({avatars.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {avatars.map(a => (
                <div
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  style={{
                    padding: '8px',
                    background: selectedId === a.id ? C.indigoBg : C.bg,
                    border: `1px solid ${selectedId === a.id ? C.indigo : C.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: C.text,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{a.name}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>{a.zone}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              padding: '12px 16px',
              background: toast.ok ? C.green : '#DC2626',
              color: 'white',
              borderRadius: '6px',
              fontSize: 14,
            }}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  )
}
