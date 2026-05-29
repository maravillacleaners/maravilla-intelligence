'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#FAFAF9', surface: '#FFFFFF', border: '#E7E5E4',
  text: '#1C1917', muted: '#78716C', xmuted: '#A8A29E',
  indigo: '#4F46E5', indigoBg: '#EEF2FF', indigoBorder: '#C7D2FE',
  red: '#DC2626', redBg: '#FEF2F2', redBorder: '#FECACA',
}

export default function LoginPage() {
  const router  = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)

  // Skip login if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('mi_token')
    if (token) {
      fetch(`/api/auth/login?token=${token}`)
        .then(r => r.json())
        .then(d => { if (d.valid) router.replace('/leads') })
        .catch(() => {})
        .finally(() => setChecking(false))
    } else {
      setChecking(false)
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) {
        localStorage.setItem('mi_token', data.token)
        router.replace('/leads')
      } else {
        setError('Incorrect password')
        setPassword('')
      }
    } catch {
      setError('Connection error — try again')
    }
    setLoading(false)
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.xmuted, animation: 'pulse 1.5s infinite' }} />
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>

      {/* Card */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '40px 40px 36px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#1C1917',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFF', fontSize: 20, fontWeight: 800, letterSpacing: -1,
          }}>M</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>Maravilla Intelligence</div>
            <div style={{ fontSize: 12, color: C.muted }}>GovCon + Commercial CRM</div>
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>Welcome back</div>
          <div style={{ fontSize: 14, color: C.muted }}>Enter your access password to continue</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Enter access password"
              autoFocus
              disabled={loading}
              style={{
                width: '100%', height: 44, padding: '0 14px',
                background: C.bg, border: `1px solid ${error ? C.redBorder : C.border}`,
                borderRadius: 9, fontSize: 14, color: C.text,
                outline: 'none', boxSizing: 'border-box' as const,
                transition: 'border-color 0.12s',
                fontFamily: 'monospace',
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = C.indigoBorder }}
              onBlur={e => { e.target.style.borderColor = error ? C.redBorder : C.border }}
            />
          </div>

          {error && (
            <div style={{
              background: C.redBg, border: `1px solid ${C.redBorder}`,
              borderRadius: 8, padding: '10px 14px', fontSize: 13,
              color: C.red, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', height: 44,
              background: loading || !password ? C.xmuted : C.indigo,
              border: 'none', borderRadius: 9,
              color: '#FFF', fontSize: 14, fontWeight: 600,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'background 0.12s',
            }}
          >
            {loading ? 'Verifying…' : 'Enter →'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, fontSize: 12, color: C.xmuted, textAlign: 'center' as const }}>
        Maravilla Cleaners LLC · suppliers.maravillacleaners.com
      </div>
    </div>
  )
}
