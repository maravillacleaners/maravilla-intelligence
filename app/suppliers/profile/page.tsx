'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyToken } from '@/lib/suppliers-auth'

interface Supplier {
  legal_name: string
  contact_name: string
  business_email: string
  phone: string
  website?: string
  services_offered: string[]
  preferred_counties: string[]
  estimated_annual_capacity_usd?: number
  notes?: string
}

export default function SupplierProfilePage() {
  const router = useRouter()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
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

        const res = await fetch(`/api/suppliers/${decoded.supplier_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to load profile')
        }

        const data = await res.json()
        setSupplier(data.supplier)
        setFormData(data.supplier)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

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

      const res = await fetch(`/api/suppliers/${decoded.supplier_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save profile')
      }

      const data = await res.json()
      setSupplier(data.supplier)
      setSuccess('Profile saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-800 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="font-medium">Profile not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Profile</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-800">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Read-only fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Legal Company Name (Read-only)
          </label>
          <input
            type="text"
            value={formData.legal_name}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Email (Read-only)
          </label>
          <input
            type="email"
            value={formData.business_email}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
          />
        </div>

        {/* Editable fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person Name</label>
          <input
            type="text"
            value={formData.contact_name}
            onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
          <input
            type="url"
            value={formData.website || ''}
            onChange={e => setFormData({ ...formData, website: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Services Offered</label>
          <div className="space-y-2">
            {['Janitorial', 'Landscaping', 'HVAC', 'Painting', 'Construction'].map(service => (
              <label key={service} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.services_offered?.includes(service)}
                  onChange={e => {
                    const updated = e.target.checked
                      ? [...(formData.services_offered || []), service]
                      : (formData.services_offered || []).filter(s => s !== service)
                    setFormData({ ...formData, services_offered: updated })
                  }}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="ml-2 text-sm">{service}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Counties</label>
          <div className="space-y-2">
            {['Lee', 'Collier', 'Hillsborough', 'Polk', 'Pinellas', 'Duval', 'Miami-Dade'].map(
              county => (
                <label key={county} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferred_counties?.includes(county)}
                    onChange={e => {
                      const updated = e.target.checked
                        ? [...(formData.preferred_counties || []), county]
                        : (formData.preferred_counties || []).filter(c => c !== county)
                      setFormData({ ...formData, preferred_counties: updated })
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm">{county} County</span>
                </label>
              )
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Annual Capacity (USD)
          </label>
          <input
            type="number"
            value={formData.estimated_annual_capacity_usd || ''}
            onChange={e =>
              setFormData({
                ...formData,
                estimated_annual_capacity_usd: parseInt(e.target.value) || undefined,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={formData.notes || ''}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => setFormData(supplier)}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-medium rounded-lg hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  )
}
