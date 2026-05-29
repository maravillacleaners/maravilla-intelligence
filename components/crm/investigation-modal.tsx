'use client'

import { useEffect, useState } from 'react'

interface EnrichmentProgress {
  source: string
  status: 'pending' | 'loading' | 'done' | 'error'
  data?: any
}

interface ProfileData {
  apollo?: any
  hunter?: any
  usaspending?: any
  samgov?: any
  synthesis?: any
}

export function InvestigationModal({
  leadId,
  entityName,
  domain,
  onClose,
  onComplete,
}: {
  leadId: string
  entityName: string
  domain?: string
  onClose: () => void
  onComplete?: (profile: ProfileData) => void
}) {
  const [progress, setProgress] = useState<Record<string, EnrichmentProgress>>({
    apollo: { source: 'apollo', status: 'pending' },
    hunter: { source: 'hunter', status: 'pending' },
    usaspending: { source: 'usaspending', status: 'pending' },
    samgov: { source: 'samgov', status: 'pending' },
    synthesis: { source: 'synthesis', status: 'pending' },
  })

  const [profileData, setProfileData] = useState<ProfileData>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams({
      id: leadId,
      entity_name: entityName,
      ...(domain && { domain }),
    })

    const eventSource = new EventSource(`/api/enrich/profile?${params}`)

    eventSource.onmessage = (e) => {
      const message = JSON.parse(e.data)
      const { source, status, data } = message

      setProgress((prev) => ({
        ...prev,
        [source]: { source, status, data },
      }))

      if (data) {
        setProfileData((prev) => ({
          ...prev,
          [source]: data,
        }))
      }

      if (source === 'system' && status === 'done') {
        eventSource.close()
        onComplete?.(data || profileData)
      }
    }

    eventSource.onerror = (err) => {
      console.error('Investigation error:', err)
      setError('Failed to complete investigation')
      eventSource.close()
    }

    return () => eventSource.close()
  }, [leadId, entityName, domain, onComplete, profileData])

  const allDone = Object.values(progress).every((p) => p.status === 'done' || p.status === 'error')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 8,
          padding: 24,
          maxWidth: 600,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>🔍 Investigating {entityName}</h2>
          {allDone && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {error && (
          <div
            style={{
              background: '#FEE2E2',
              color: '#991B1B',
              padding: 12,
              borderRadius: 4,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Progress Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {['apollo', 'hunter', 'usaspending', 'samgov', 'synthesis'].map((source) => {
            const p = progress[source]
            const icons: Record<string, string> = {
              apollo: '👤',
              hunter: '📧',
              usaspending: '💰',
              samgov: '🏛️',
              synthesis: '🧠',
            }
            const colors: Record<string, string> = {
              pending: '#E7E5E4',
              loading: '#FCD34D',
              done: '#16A34A',
              error: '#DC2626',
            }

            return (
              <div
                key={source}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  background: colors[p.status],
                  color: '#1C1917',
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 500,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 18 }}>
                  {p.status === 'done' && '✅'}
                  {p.status === 'loading' && '⏳'}
                  {p.status === 'error' && '❌'}
                  {p.status === 'pending' && '⭕'}
                </span>
                <span>{icons[source] || source}</span>
                <span style={{ fontSize: 11 }}>{source}</span>
              </div>
            )
          })}
        </div>

        {/* Loading Message */}
        {!allDone && (
          <div
            style={{
              textAlign: 'center',
              padding: 16,
              color: '#78716C',
              fontSize: 14,
            }}
          >
            ⏳ Investigating from {Object.values(progress).filter((p) => p.status === 'done').length}/5 sources...
          </div>
        )}

        {/* Results */}
        {profileData.synthesis && (
          <div style={{ background: '#F5F3FF', padding: 16, borderRadius: 6 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>Profile Synthesis</h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#1C1917' }}>
              {profileData.synthesis.profile}
            </p>
            {profileData.synthesis.icebreaker && (
              <>
                <h4 style={{ margin: '12px 0 4px 0', fontSize: 12, fontWeight: 600, color: '#4F46E5' }}>Icebreaker</h4>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: '#78716C', fontStyle: 'italic' }}>
                  {profileData.synthesis.icebreaker}
                </p>
              </>
            )}
          </div>
        )}

        {/* Data Breakdown */}
        {profileData.apollo?.people?.[0] && (
          <div style={{ marginTop: 16, borderTop: '1px solid #E7E5E4', paddingTop: 16 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>Decision Maker</h3>
            <div style={{ fontSize: 13, color: '#1C1917' }}>
              <div>
                <strong>{profileData.apollo.people[0].name}</strong>
              </div>
              <div style={{ color: '#78716C' }}>{profileData.apollo.people[0].title}</div>
              {profileData.apollo.people[0].email && <div>{profileData.apollo.people[0].email}</div>}
              {profileData.apollo.people[0].phone && <div>{profileData.apollo.people[0].phone}</div>}
            </div>
          </div>
        )}

        {profileData.usaspending?.contracts?.[0] && (
          <div style={{ marginTop: 16, borderTop: '1px solid #E7E5E4', paddingTop: 16 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>Recent Contracts</h3>
            <div style={{ fontSize: 12, color: '#78716C' }}>
              {profileData.usaspending.contracts.slice(0, 3).map((c: any, i: number) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  💰 {c.awarding_agency}: ${(c.total_obligation / 1e6).toFixed(1)}M
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
