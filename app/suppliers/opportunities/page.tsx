'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { decodeToken } from '@/lib/suppliers-auth'
import Link from 'next/link'

interface Opportunity {
  id: string
  opportunity_name: string
  agency: string
  value: number
  match_score: number
  deadline: string
  status: string
}

export default function OpportunitiesPage() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [filtered, setFiltered] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'deadline' | 'value' | 'match'>('deadline')
  const [minMatchScore, setMinMatchScore] = useState(60)

  useEffect(() => {
    const loadOpportunities = async () => {
      try {
        const token = localStorage.getItem('supplier_token')
        if (!token) {
          router.push('/suppliers/login')
          return
        }

        const decoded = decodeToken(token)
        if (!decoded) {
          localStorage.removeItem('supplier_token')
          router.push('/suppliers/login')
          return
        }

        const res = await fetch('/api/suppliers/opportunities', {
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

  // Apply filtering and sorting
  useEffect(() => {
    let result = opportunities.filter(
      o =>
        (o.opportunity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.agency.toLowerCase().includes(searchTerm.toLowerCase())) &&
        o.match_score >= minMatchScore &&
        o.status === 'Available'
    )

    result.sort((a, b) => {
      if (sortBy === 'deadline') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      } else if (sortBy === 'value') {
        return b.value - a.value
      } else {
        return b.match_score - a.match_score
      }
    })

    setFiltered(result)
  }, [opportunities, searchTerm, sortBy, minMatchScore])

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 70) return 'bg-blue-100 text-blue-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getDaysUntilDeadline = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return days
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
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Matched Opportunities</h1>
        <p className="text-gray-600 mt-1">
          {filtered.length} of {opportunities.length} opportunities match your criteria
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Contract name or agency..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Match Score</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minMatchScore}
                onChange={e => setMinMatchScore(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 w-12">{minMatchScore}%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'deadline' | 'value' | 'match')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="deadline">Deadline (Soon)</option>
              <option value="value">Contract Value (High)</option>
              <option value="match">Match Score (High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">No opportunities match your search criteria</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or match score threshold</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(opp => {
            const daysLeft = getDaysUntilDeadline(opp.deadline)
            const isUrgent = daysLeft <= 7 && daysLeft > 0

            return (
              <div key={opp.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                      {opp.opportunity_name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{opp.agency}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getMatchScoreColor(opp.match_score)}`}>
                      {opp.match_score}% Match
                    </span>
                    {isUrgent && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ⏰ {daysLeft}d left
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-4 py-3 border-y border-gray-200">
                  <div>
                    <p className="text-xs text-gray-600">Contract Value</p>
                    <p className="text-sm font-semibold text-gray-900">${opp.value.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Deadline</p>
                    <p className="text-sm font-semibold text-gray-900">{new Date(opp.deadline).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Days Left</p>
                    <p className={`text-sm font-semibold ${isUrgent ? 'text-red-600' : 'text-gray-900'}`}>
                      {daysLeft > 0 ? `${daysLeft}d` : 'Expired'}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs text-gray-600">Status</p>
                    <p className="text-sm font-semibold text-green-600">Available</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link
                    href={`/suppliers/opportunities/${opp.id}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-center text-sm"
                  >
                    View Details
                  </Link>
                  <button className="px-4 py-2 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition text-sm">
                    Save
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
