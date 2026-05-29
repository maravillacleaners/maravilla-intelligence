'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AdminSetup() {
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null)

  const handleSetupFields = async () => {
    setLoading(true)
    setStatus('Setting up Airtable fields...')
    setStatusType(null)

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup-fields' }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus(`✅ ${data.message}`)
        setStatusType('success')
      } else {
        setStatus(`❌ Error: ${data.error}`)
        setStatusType('error')
      }
    } catch (error) {
      setStatus(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleRunScraper = async (scraper: string) => {
    setLoading(true)
    setStatus(`Running ${scraper} scraper...`)
    setStatusType(null)

    try {
      const response = await fetch(`/api/scrapers/${scraper}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus(`✅ ${scraper} scraper found ${data.contractsFound || data.awardsFound || 0} items`)
        setStatusType('success')
      } else {
        setStatus(`❌ Error: ${data.error}`)
        setStatusType('error')
      }
    } catch (error) {
      setStatus(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">System Setup</h1>
          <p className="text-lg text-gray-600">Configure and initialize the Maravilla Intelligence system</p>
        </div>

        <div className="grid gap-6">
          {/* Airtable Setup Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Airtable Configuration</h2>
                  <p className="text-gray-600">Create missing fields in the SUBS_STAGING base for supplier data management</p>
                </div>
              </div>
              <button
                onClick={handleSetupFields}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-semibold text-white transition inline-flex items-center gap-2 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                }`}
              >
                {loading && <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>}
                {loading ? 'Setting up...' : 'Setup Fields'}
              </button>
            </div>
          </div>

          {/* Contract Discovery Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Contract Discovery</h2>
                  <p className="text-gray-600">Manually trigger contract scrapers for immediate data refresh</p>
                </div>
              </div>
              <div className="flex gap-4 flex-wrap">
                <button
                  onClick={() => handleRunScraper('sam-gov')}
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg font-semibold text-white transition ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                  }`}
                >
                  SAM.gov Scraper
                </button>
                <button
                  onClick={() => handleRunScraper('usaspending')}
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg font-semibold text-white transition ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                  }`}
                >
                  USASpending Scraper
                </button>
              </div>
            </div>
          </div>

          {/* Status Alert */}
          {status && (
            <div
              className={`rounded-xl border overflow-hidden transition ${
                statusType === 'success'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="p-6 flex items-start gap-4">
                {statusType === 'success' ? (
                  <svg className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div>
                  <h3 className={`font-semibold ${
                    statusType === 'success' ? 'text-emerald-900' : 'text-red-900'
                  }`}>
                    {statusType === 'success' ? 'Success' : 'Error'}
                  </h3>
                  <p className={statusType === 'success' ? 'text-emerald-700' : 'text-red-700'}>
                    {status}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* System Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">System Status</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium mb-1">Base ID</p>
                  <code className="text-lg font-mono text-blue-600 break-all">appZhXnyFiKbnOZLr</code>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium mb-1">Suppliers Table</p>
                  <code className="text-lg font-mono text-blue-600 break-all">tbl7NYtv13vA377a1</code>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium mb-1">Status</p>
                  <p className="text-lg font-semibold text-emerald-600">✓ Ready</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
