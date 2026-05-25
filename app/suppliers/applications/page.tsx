'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyToken } from '@/lib/suppliers-auth'

interface Application {
  id: string
  opportunity_name: string
  application_status: string
  application_date: string
  response_date?: string
}

export default function ApplicationsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const loadApplications = async () => {
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

        const res = await fetch(`/api/suppliers/${decoded.supplier_id}/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to load applications')
        }

        const data = await res.json()
        setApplications(data.applications || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading applications')
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [router])

  const filtered = statusFilter
    ? applications.filter(a => a.application_status === statusFilter)
    : applications

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted':
        return 'bg-blue-100 text-blue-800'
      case 'Under Review':
        return 'bg-yellow-100 text-yellow-800'
      case 'Accepted':
        return 'bg-green-100 text-green-800'
      case 'Rejected':
        return 'bg-red-100 text-red-800'
      case 'Withdrawn':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading applications...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-800 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="font-medium">Error Loading Applications</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>

      <select
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Status</option>
        <option value="Submitted">Submitted</option>
        <option value="Under Review">Under Review</option>
        <option value="Accepted">Accepted</option>
        <option value="Rejected">Rejected</option>
        <option value="Withdrawn">Withdrawn</option>
      </select>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-gray-600">
            {statusFilter ? 'No applications found with selected status' : 'You haven\'t submitted any applications yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Opportunity</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Applied</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Response</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => (
                <tr key={app.id} className="border-b hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-900 font-medium">{app.opportunity_name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(app.application_status)}`}>
                      {app.application_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(app.application_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {app.response_date ? new Date(app.response_date).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
