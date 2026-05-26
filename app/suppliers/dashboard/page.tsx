'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { decodeToken, type SupplierJWT } from '@/lib/suppliers-auth'

interface DashboardData {
  supplier: {
    legal_name: string
    supplier_id: string
    registration_status: string
    contact_name: string
  }
  opportunities: Array<{
    id: string
    opportunity_name: string
    agency: string
    deadline: string
    contract_value_usd: number
    status: string
  }>
  applications: Array<{
    id: string
    opportunity_name: string
    application_status: string
    application_date: string
  }>
}

export default function SupplierDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [decoded, setDecoded] = useState<SupplierJWT | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // Check token in localStorage
        const token = localStorage.getItem('supplier_token')
        if (!token) {
          router.push('/suppliers/login')
          return
        }

        // Verify token
        const decodedToken = decodeToken(token)
        if (!decodedToken) {
          localStorage.removeItem('supplier_token')
          router.push('/suppliers/login')
          return
        }

        setDecoded(decodedToken)

        // Fetch dashboard data
        const res = await fetch(`/api/suppliers/${decodedToken.supplier_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to load dashboard')
        }

        const dashboardData = await res.json()
        setData(dashboardData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-800 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="font-medium">Error Loading Dashboard</p>
          <p className="text-sm mt-2">{error || 'Failed to load dashboard'}</p>
        </div>
      </div>
    )
  }

  // Map status to color classes
  const statusColorMap: Record<string, string> = {
    'Pending Review': 'bg-yellow-100 text-yellow-800',
    'Approved': 'bg-green-100 text-green-800',
    'Active': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Inactive': 'bg-gray-100 text-gray-800',
  }

  const statusColor = statusColorMap[data.supplier.registration_status] || statusColorMap['Pending Review']

  // Calculate KPI counts
  const availableOpportunities = data.opportunities.filter(o => o.status === 'Available').length
  const submittedApplications = data.applications.length

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {data.supplier.legal_name}!
            </h1>
            <p className="text-gray-600 mt-1">Here's your opportunity summary</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${statusColor}`}>
            {data.supplier.registration_status}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Available Opportunities</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{availableOpportunities}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Submitted Applications</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{submittedApplications}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Unread Notifications</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">0</p>
        </div>
      </div>

      {/* Recent Opportunities */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Opportunities</h2>
        {data.opportunities.slice(0, 3).length === 0 ? (
          <p className="text-gray-600 text-sm py-4">No opportunities available yet</p>
        ) : (
          <div className="space-y-3">
            {data.opportunities.slice(0, 3).map(opp => (
              <div key={opp.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{opp.opportunity_name}</h3>
                    <p className="text-sm text-gray-600">{opp.agency}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Deadline: {new Date(opp.deadline).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-medium text-gray-900">
                      ${opp.contract_value_usd.toLocaleString()}
                    </p>
                    {opp.status === 'Available' && (
                      <Link
                        href={`/suppliers/opportunities/${opp.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 block"
                      >
                        View Details
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/suppliers/opportunities"
          className="text-blue-600 hover:text-blue-800 font-medium text-sm mt-4 block"
        >
          View All Opportunities →
        </Link>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Applications</h2>
        {data.applications.slice(0, 3).length === 0 ? (
          <p className="text-gray-600 text-sm py-4">You haven't submitted any applications yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Opportunity</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.applications.slice(0, 3).map(app => (
                  <tr key={app.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-gray-900">{app.opportunity_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {app.application_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(app.application_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link
          href="/suppliers/applications"
          className="text-blue-600 hover:text-blue-800 font-medium text-sm mt-4 block"
        >
          View All Applications →
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            href="/suppliers/opportunities"
            className="block p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition"
          >
            <p className="font-medium text-gray-900">📋 View All Opportunities</p>
            <p className="text-sm text-gray-600 mt-1">Browse and apply to opportunities</p>
          </Link>
          <Link
            href="/suppliers/applications"
            className="block p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition"
          >
            <p className="font-medium text-gray-900">📊 Track Applications</p>
            <p className="text-sm text-gray-600 mt-1">Check status of submitted proposals</p>
          </Link>
          <Link
            href="/suppliers/profile"
            className="block p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition"
          >
            <p className="font-medium text-gray-900">⚙️ Edit Profile</p>
            <p className="text-sm text-gray-600 mt-1">Update your company information</p>
          </Link>
          <button
            type="button"
            className="text-left block p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition"
          >
            <p className="font-medium text-gray-900">📥 Download Documents</p>
            <p className="text-sm text-gray-600 mt-1">Access certifications and files</p>
          </button>
        </div>
      </div>
    </div>
  )
}
