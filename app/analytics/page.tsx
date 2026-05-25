'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AnalyticsData {
  totalProspects: number
  totalContracts: number
  totalSubs: number
  averageScore: number
  scoreDistribution: {
    high: number
    medium: number
    low: number
  }
  bySegment: { [key: string]: number }
  byStatus: { [key: string]: number }
  topOpportunities: Array<{ name: string; value: number; agency?: string }>
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/analytics')
        const data = await response.json()

        if (data.success) {
          setAnalytics(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Failed to load analytics</p>
      </div>
    )
  }

  const totalRecords =
    analytics.totalProspects + analytics.totalContracts + analytics.totalSubs

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Logout
          </button>
        </div>
        <p className="text-gray-600 text-sm mt-2">Discovery pipeline overview and metrics</p>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Records</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">{totalRecords}</p>
            <p className="text-xs text-gray-500 mt-2">
              {analytics.totalProspects} prospects • {analytics.totalContracts} contracts •{' '}
              {analytics.totalSubs} subs
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Score</p>
            <p className="text-4xl font-bold text-blue-600 mt-2">{analytics.averageScore}</p>
            <p className="text-xs text-gray-500 mt-2">out of 100</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide">High Priority</p>
            <p className="text-4xl font-bold text-red-600 mt-2">
              {analytics.scoreDistribution.high}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {Math.round((analytics.scoreDistribution.high / analytics.totalProspects) * 100)}%
              of prospects
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Top Opportunity</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {analytics.topOpportunities.length > 0
                ? `$${(analytics.topOpportunities[0].value / 1000000).toFixed(1)}M`
                : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-2">federal contract value</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Score Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Score Distribution</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">High (75+)</span>
                  <span className="font-bold text-red-600">
                    {analytics.scoreDistribution.high}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{
                      width: `${
                        (analytics.scoreDistribution.high /
                          (analytics.totalProspects || 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Medium (50-74)</span>
                  <span className="font-bold text-yellow-600">
                    {analytics.scoreDistribution.medium}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{
                      width: `${
                        (analytics.scoreDistribution.medium /
                          (analytics.totalProspects || 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Low (&lt;50)</span>
                  <span className="font-bold text-green-600">
                    {analytics.scoreDistribution.low}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${
                        (analytics.scoreDistribution.low /
                          (analytics.totalProspects || 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* By Segment */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">By ICP Segment</h2>
            <div className="space-y-2">
              {Object.entries(analytics.bySegment).map(([segment, count]) => (
                <div key={segment} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{segment}</span>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status & Opportunities */}
        <div className="grid grid-cols-2 gap-4">
          {/* By Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pipeline Status</h2>
            <div className="space-y-2">
              {Object.entries(analytics.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 capitalize">{status}</span>
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Opportunities */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Top Contract Opportunities</h2>
            <div className="space-y-3">
              {analytics.topOpportunities.length > 0 ? (
                analytics.topOpportunities.map((opp, idx) => (
                  <div key={idx} className="border-l-4 border-green-600 pl-3">
                    <p className="text-sm font-medium text-gray-900">{opp.name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-600">{opp.agency}</span>
                      <span className="text-sm font-bold text-green-600">
                        ${(opp.value / 1000000).toFixed(2)}M
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600">No contracts discovered yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
