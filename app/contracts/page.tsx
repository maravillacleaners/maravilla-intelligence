'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Contract {
  id: string
  legal_name: string
  agency: string
  total_obligated_amount: number
  score: number
  priority: 'high' | 'medium' | 'low'
  pipeline_status: string
  event_date: string
  teaming_email_draft: string
}

export default function ContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchContracts = async () => {
      try {
        setLoading(true)
        const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
        const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

        const response = await fetch(
          `https://api.airtable.com/v0/${baseId}/Intelligence?filterByFormula={record_type}='contract'`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch contracts')
        }

        const data = await response.json()
        const contractsData = (data.records || []).map((record: any) => ({
          id: record.id,
          legal_name: record.fields.legal_name || 'Unknown',
          agency: record.fields.agency || 'N/A',
          total_obligated_amount: record.fields.total_obligated_amount || 0,
          score: record.fields.score || 0,
          priority: record.fields.priority || 'low',
          pipeline_status: record.fields.pipeline_status || 'pending',
          event_date: record.fields.event_date || '',
          teaming_email_draft: record.fields.teaming_email_draft || '',
        }))

        setContracts(contractsData)
      } catch (err) {
        setError('Failed to load contracts')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchContracts()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    router.push('/login')
  }

  const handleCopyEmail = () => {
    if (selectedContract?.teaming_email_draft) {
      navigator.clipboard.writeText(selectedContract.teaming_email_draft)
      setToastMessage('✓ Email draft copied to clipboard')
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading contracts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Federal Contracts</h1>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Logout
          </button>
        </div>
        <p className="text-gray-600 text-sm mt-2">
          {contracts.length} federal contract opportunities
        </p>
      </div>

      {/* Content */}
      <div className="p-4 grid grid-cols-3 gap-4">
        {/* List */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200 max-h-[calc(100vh-150px)] overflow-y-auto">
              {contracts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No contracts found</p>
                  <p className="text-xs mt-2">Contracts appear here after SAM.gov discovery</p>
                </div>
              ) : (
                contracts.map(contract => (
                  <button
                    key={contract.id}
                    onClick={() => setSelectedContract(contract)}
                    className={`w-full text-left p-4 hover:bg-blue-50 transition ${
                      selectedContract?.id === contract.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    <p className="font-semibold text-gray-900 text-sm">
                      {contract.legal_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{contract.agency}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        ${(contract.total_obligated_amount / 1000000).toFixed(1)}M
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          contract.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : contract.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {contract.priority}
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
          {selectedContract ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedContract.legal_name}
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Agency</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedContract.agency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Estimated Value
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${(selectedContract.total_obligated_amount / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Score</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedContract.score}/100
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Deadline</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(selectedContract.event_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Email Draft */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900">Teaming Email Draft</h3>
                  <button
                    onClick={handleCopyEmail}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                  >
                    Copy
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedContract.teaming_email_draft}
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium">Status:</span>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
                  {selectedContract.pipeline_status}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-gray-600">Select a contract to view details</p>
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
