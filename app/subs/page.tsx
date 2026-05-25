'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Sub {
  id: string
  legal_name: string
  county: string
  sub_category: string
  score: number
  priority: 'high' | 'medium' | 'low'
  pipeline_status: string
  business_email: string
  phone: string
}

export default function SubsPage() {
  const router = useRouter()
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSub, setSelectedSub] = useState<Sub | null>(null)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchSubs = async () => {
      try {
        setLoading(true)
        const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
        const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

        const response = await fetch(
          `https://api.airtable.com/v0/${baseId}/Intelligence?filterByFormula={record_type}='sub'`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch subs')
        }

        const data = await response.json()
        const subsData = (data.records || []).map((record: any) => ({
          id: record.id,
          legal_name: record.fields.legal_name || 'Unknown',
          county: record.fields.county || 'Unknown',
          sub_category: record.fields.sub_category || 'N/A',
          score: record.fields.score || 0,
          priority: record.fields.priority || 'low',
          pipeline_status: record.fields.pipeline_status || 'pending',
          business_email: record.fields.business_email || 'N/A',
          phone: record.fields.phone || 'N/A',
        }))

        setSubs(subsData)
      } catch (err) {
        setError('Failed to load subs')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchSubs()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading subcontractors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Subcontractors</h1>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Logout
          </button>
        </div>
        <p className="text-gray-600 text-sm mt-2">
          {subs.length} potential subcontractors identified
        </p>
      </div>

      {/* Content */}
      <div className="p-4 grid grid-cols-3 gap-4">
        {/* List */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200 max-h-[calc(100vh-150px)] overflow-y-auto">
              {subs.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No subcontractors found</p>
                  <p className="text-xs mt-2">Subs appear after Flow B discovery completes</p>
                </div>
              ) : (
                subs.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    className={`w-full text-left p-4 hover:bg-green-50 transition ${
                      selectedSub?.id === sub.id ? 'bg-green-100' : ''
                    }`}
                  >
                    <p className="font-semibold text-gray-900 text-sm">{sub.legal_name}</p>
                    <p className="text-xs text-gray-500 mt-1">{sub.county}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                        {sub.sub_category}
                      </span>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        Score: {sub.score}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="col-span-2">
          {selectedSub ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedSub.legal_name}
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedSub.county}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Category</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedSub.sub_category}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-sm font-mono text-blue-600">{selectedSub.business_email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedSub.phone}</p>
                </div>
              </div>

              {/* Score & Priority */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Fit Score</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${selectedSub.score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {selectedSub.score}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Priority</p>
                  <span
                    className={`inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full ${
                      selectedSub.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : selectedSub.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {selectedSub.priority}
                  </span>
                </div>
              </div>

              {/* Call to Action */}
              <button className="w-full bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 transition">
                Contact Subcontractor
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-gray-600">Select a subcontractor to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
