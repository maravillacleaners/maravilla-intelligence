'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProspects, Prospect } from '@/lib/airtable-client'

export default function ProspectsPage() {
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [approving, setApproving] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    // Check auth
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    // Fetch prospects
    const fetchProspects = async () => {
      try {
        setLoading(true)
        const data = await getProspects()
        setProspects(data)
        console.log(`Loaded ${data.length} prospects`)
      } catch (err) {
        setError('Failed to load prospects')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchProspects()
  }, [router])

  const handleApprove = async () => {
    if (!selectedProspect) return

    setApproving(true)
    try {
      const response = await fetch('/api/prospects/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: selectedProspect.id,
          email: selectedProspect.legal_name?.toLowerCase().replace(/\s+/g, '.') + '@prospect.com',
          name: selectedProspect.legal_name,
          locationId: process.env.NEXT_PUBLIC_GHL_LOCATION_ID || 'default',
        }),
      })

      if (!response.ok) {
        throw new Error('Approval failed')
      }

      const data = await response.json()
      console.log('Approval response:', data)

      // Update local state
      setProspects(
        prospects.map(p =>
          p.id === selectedProspect.id
            ? { ...p, pipeline_status: 'approved' }
            : p
        )
      )

      setSelectedProspect({
        ...selectedProspect,
        pipeline_status: 'approved',
      })

      setToastMessage(`✓ Prospect approved and synced to GHL`)
      setTimeout(() => setToastMessage(''), 3000)
    } catch (err) {
      console.error('Approval error:', err)
      setToastMessage('✗ Approval failed')
      setTimeout(() => setToastMessage(''), 3000)
    } finally {
      setApproving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_email')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading prospects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Prospects</h1>
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {toastMessage && (
          <div className="fixed bottom-4 right-4 bg-white border border-gray-200 shadow-lg px-4 py-3 rounded-lg z-50">
            {toastMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {prospects.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No prospects found. Check your Airtable connection.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {prospects.map(prospect => (
                      <tr
                        key={prospect.id}
                        onClick={() => setSelectedProspect(prospect)}
                        className={`cursor-pointer hover:bg-blue-50 transition ${
                          selectedProspect?.id === prospect.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {prospect.legal_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {prospect.score}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              prospect.priority === 'high'
                                ? 'bg-red-100 text-red-800'
                                : prospect.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {prospect.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              prospect.pipeline_status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {prospect.pipeline_status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedProspect ? (
            <div className="bg-white rounded-lg shadow p-6 h-fit">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {selectedProspect.legal_name}
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase mb-1">
                    Score
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedProspect.score}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase mb-1">
                    Priority
                  </label>
                  <p className="text-sm text-gray-700 capitalize">
                    {selectedProspect.priority}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase mb-1">
                    Status
                  </label>
                  <p className="text-sm text-gray-700 capitalize">
                    {selectedProspect.pipeline_status || 'pending'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase mb-1">
                    Icebreaker
                  </label>
                  <p className="text-sm text-gray-700">
                    {selectedProspect.icebreaker || 'No icebreaker'}
                  </p>
                </div>

                {selectedProspect.ghl_contact_id && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 uppercase mb-1">
                      GHL Contact ID
                    </label>
                    <p className="text-xs text-gray-500 font-mono">
                      {selectedProspect.ghl_contact_id}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleApprove}
                disabled={
                  approving ||
                  selectedProspect.pipeline_status === 'approved'
                }
                className={`w-full py-2 rounded-lg font-medium transition ${
                  selectedProspect.pipeline_status === 'approved'
                    ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
                }`}
              >
                {approving
                  ? 'Approving...'
                  : selectedProspect.pipeline_status === 'approved'
                  ? '✓ Approved'
                  : 'Approve & Sync to GHL'}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 h-fit text-center text-gray-500">
              Select a prospect to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
