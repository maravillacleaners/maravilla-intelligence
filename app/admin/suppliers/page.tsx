'use client'

import { useEffect, useState } from 'react'

interface Supplier {
  id: string
  supplier_id: string
  legal_name: string
  contact_name: string
  business_email: string
  sub_category: string
  services_offered: string[]
  registration_status: string
  registration_date: string
}

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('Pending Review')
  const [updating, setUpdating] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadSuppliers()
  }, [statusFilter])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/suppliers?status=${encodeURIComponent(statusFilter)}`)

      if (!res.ok) {
        throw new Error(`Failed to load suppliers: ${res.statusText}`)
      }

      const data = await res.json()
      setSuppliers(data.suppliers || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load suppliers'
      setError(message)
      console.error('Error loading suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (supplierId: string) => {
    if (!window.confirm('Are you sure you want to approve this supplier?')) {
      return
    }

    setUpdating(supplierId)
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplierId,
          registration_status: 'Active',
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to approve supplier')
      }

      setSuccessMessage(`Supplier approved successfully`)
      setTimeout(() => setSuccessMessage(null), 3000)

      // Reload suppliers
      await loadSuppliers()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error approving supplier'
      alert(message)
      console.error('Error approving supplier:', err)
    } finally {
      setUpdating(null)
    }
  }

  const handleReject = async (supplierId: string) => {
    if (!window.confirm('Are you sure you want to reject this supplier? This cannot be undone.')) {
      return
    }

    setUpdating(supplierId)
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplierId,
          registration_status: 'Rejected',
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to reject supplier')
      }

      setSuccessMessage(`Supplier rejected`)
      setTimeout(() => setSuccessMessage(null), 3000)

      // Reload suppliers
      await loadSuppliers()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error rejecting supplier'
      alert(message)
      console.error('Error rejecting supplier:', err)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Supplier Management</h1>
          <p className="mt-2 text-gray-600">Review and manage supplier registrations</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 border border-green-200">
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Pending Review">Pending Review</option>
            <option value="Active">Active</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Suppliers Table */}
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <div className="inline-block">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            </div>
            <p className="mt-4 text-gray-600">Loading suppliers...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600">No suppliers found with status: {statusFilter}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Company</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Contact</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Category</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Services</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Submitted</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {suppliers.map((supplier) => (
                  <tr key={supplier.supplier_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{supplier.legal_name}</td>
                    <td className="px-6 py-4 text-gray-700">{supplier.contact_name}</td>
                    <td className="px-6 py-4 text-gray-700">{supplier.business_email}</td>
                    <td className="px-6 py-4 text-gray-700">{supplier.sub_category}</td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="flex flex-wrap gap-1">
                        {supplier.services_offered && supplier.services_offered.length > 0 ? (
                          supplier.services_offered.slice(0, 2).map((service, idx) => (
                            <span
                              key={idx}
                              className="inline-block rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                            >
                              {service}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                        {supplier.services_offered && supplier.services_offered.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{supplier.services_offered.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {new Date(supplier.registration_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {supplier.registration_status === 'Pending Review' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(supplier.supplier_id)}
                            disabled={updating === supplier.supplier_id}
                            className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {updating === supplier.supplier_id ? 'Updating...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(supplier.supplier_id)}
                            disabled={updating === supplier.supplier_id}
                            className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {updating === supplier.supplier_id ? 'Updating...' : 'Reject'}
                          </button>
                        </div>
                      )}
                      {supplier.registration_status === 'Active' && (
                        <span className="inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                          ✓ Active
                        </span>
                      )}
                      {supplier.registration_status === 'Rejected' && (
                        <span className="inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                          ✗ Rejected
                        </span>
                      )}
                      {supplier.registration_status === 'Approved' && (
                        <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          ✓ Approved
                        </span>
                      )}
                      {supplier.registration_status === 'Inactive' && (
                        <span className="inline-block rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                          ○ Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer Stats */}
            <div className="border-t bg-gray-50 px-6 py-4">
              <p className="text-sm text-gray-600">
                Showing {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} with status:{' '}
                <strong>{statusFilter}</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
