'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyToken } from '@/lib/suppliers-auth'

interface Opportunity {
  id: string
  opportunity_name: string
  agency: string
  deadline: string
  contract_value_usd: number
  match_score: number
  match_reason: string
  status: string
}

export default function OpportunitiesPage() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('deadline')
  const [applying, setApplying] = useState<string | null>(null)

  useEffect(() => {
    const loadOpportunities = async () => {
      try {
        const token = localStorage.getItem('supplier_token')
        if (!token) {
          router.push('/suppliers/login')
          return
        }

        const decoded = verifyToken(token)
        if (!decoded) {
          localStorage.removeItem('supplier_token')
          router.push('/suppliers/login')
          return
        }

        setSupplierId(decoded.supplier_id)

        const res = await fetch(`/api/suppliers/${decoded.supplier_id}/opportunities`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to load opportunities')
        }

        const data = await res.json()
        setOpportunities(data.opportunities || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading opportunities')
      } finally {
        setLoading(false)
      }
    }

    loadOpportunities()
  }, [router])

  const filtered = statusFilter
    ? opportunities.filter(o => o.status === statusFilter)
    : opportunities

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'deadline') {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    if (sortBy === 'value') {
      return b.contract_value_usd - a.contract_value_usd
    }
    if (sortBy === 'score') {
      return b.match_score - a.match_score
    }
    return 0
  })

  const handleApply = async (opportunityId: string) => {
    try {
      setApplying(opportunityId)
      const token = localStorage.getItem('supplier_token')

      const res = await fetch(`/api/suppliers/${supplierId}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to apply')
      }

      // Refresh opportunities
      window.location.reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Application failed')
      setApplying(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading opportunities...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-800 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="font-medium">Error Loading Opportunities</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      <h1 className="text-3xl font-bold text-gray-900">Available Opportunities</h1>

      <div className="flex gap-4 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="Available">Available</option>
          <option value="Applied">Applied</option>
          <option value="Declined">Declined</option>
          <option value="Selected">Selected</option>
          <option value="Won">Won</option>
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="deadline">Sort by Deadline (Soon)</option>
          <option value="value">Sort by Value (High)</option>
          <option value="score">Sort by Score (High)</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-gray-600">
            {statusFilter ? 'No opportunities found with selected status' : 'No opportunities available yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(opp => (
            <div key={opp.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{opp.opportunity_name}</h2>
                  <p className="text-sm text-gray-600">{opp.agency}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-blue-600">${opp.contract_value_usd.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Match: {opp.match_score}%</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-4">{opp.match_reason}</p>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Deadline: {new Date(opp.deadline).toLocaleDateString()}
                </p>
                {opp.status === 'Available' && (
                  <button
                    onClick={() => handleApply(opp.id)}
                    disabled={applying === opp.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    {applying === opp.id ? 'Applying...' : 'Apply Now'}
                  </button>
                )}
                {opp.status === 'Applied' && (
                  <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                    Applied
                  </span>
                )}
                {opp.status === 'Declined' && (
                  <span className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
                    Declined
                  </span>
                )}
                {opp.status === 'Selected' && (
                  <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium">
                    Selected
                  </span>
                )}
                {opp.status === 'Won' && (
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                    Won
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
