'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  description?: string
  requirements?: string
  contract_type?: string
}

export default function OpportunityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const opportunityId = params.id as string

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    const loadOpportunity = async () => {
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

        // Fetch opportunity details from Airtable
        const res = await fetch('/api/suppliers/opportunities', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          throw new Error('Failed to load opportunities')
        }

        const data = await res.json()
        const found = data.opportunities?.find((o: Opportunity) => o.id === opportunityId)

        if (!found) {
          setError('Opportunity not found')
          return
        }

        setOpportunity(found)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading opportunity')
      } finally {
        setLoading(false)
      }
    }

    loadOpportunity()
  }, [router, opportunityId])

  const handleApply = async () => {
    setApplying(true)
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

      // Submit application (placeholder - will be implemented when applications API is ready)
      // const res = await fetch(`/api/suppliers/${decoded.supplier_id}/applications`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`,
      //   },
      //   body: JSON.stringify({
      //     opportunity_id: opportunityId,
      //   }),
      // })

      // For now, just mark as applied
      setApplied(true)
      setTimeout(() => {
        router.push('/suppliers/applications')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply')
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading opportunity...</p>
      </div>
    )
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-800 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="font-medium">Error Loading Opportunity</p>
          <p className="text-sm mt-2">{error || 'Opportunity not found'}</p>
          <Link href="/suppliers/opportunities" className="text-red-600 hover:text-red-800 text-sm mt-4 block">
            ← Back to opportunities
          </Link>
        </div>
      </div>
    )
  }

  const daysLeft = Math.ceil((new Date(opportunity.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const isUrgent = daysLeft <= 7 && daysLeft > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <Link href="/suppliers/opportunities" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
        ← Back to opportunities
      </Link>

      {applied && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          ✓ Application submitted successfully! Redirecting to applications...
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{opportunity.opportunity_name}</h1>
            <p className="text-gray-600 mt-2">{opportunity.agency}</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {opportunity.match_score}% Match
            </span>
            {isUrgent && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                ⏰ {daysLeft}d left
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Contract Value</p>
          <p className="text-xl font-bold text-gray-900">${opportunity.value.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Deadline</p>
          <p className="text-lg font-bold text-gray-900">{new Date(opportunity.deadline).toLocaleDateString()}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Days Left</p>
          <p className={`text-lg font-bold ${isUrgent ? 'text-red-600' : 'text-gray-900'}`}>
            {daysLeft > 0 ? `${daysLeft}d` : 'Expired'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Status</p>
          <p className="text-lg font-bold text-green-600">{opportunity.status}</p>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Opportunity Overview</h2>
        <p className="text-gray-700 leading-relaxed">
          {opportunity.description || 'No description available. Please contact the agency for more information.'}
        </p>
      </div>

      {/* Requirements */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Requirements</h2>
        <div className="prose prose-sm max-w-none text-gray-700">
          {opportunity.requirements ? (
            <p>{opportunity.requirements}</p>
          ) : (
            <p>No specific requirements listed. Please refer to the official opportunity document on SAM.gov or USASpending.</p>
          )}
        </div>
      </div>

      {/* Why This Match */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-lg font-bold text-blue-900 mb-3">Why This Opportunity Matches You</h2>
        <p className="text-blue-800">
          This opportunity has a <strong>{opportunity.match_score}% match score</strong> based on:
        </p>
        <ul className="list-disc list-inside mt-3 text-blue-800 space-y-1">
          <li>Your business services and capabilities</li>
          <li>Geographic service areas you operate in</li>
          <li>Your estimated business capacity</li>
          <li>Agency requirements and specifications</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={handleApply}
          disabled={applying || opportunity.status !== 'Available'}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition text-center ${
            applying
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : opportunity.status === 'Available'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
        >
          {applying ? 'Submitting Application...' : 'Submit Application'}
        </button>

        <button
          type="button"
          className="flex-1 px-6 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
        >
          Save for Later
        </button>
      </div>

      {/* Additional Info */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
        <p>
          This opportunity information is sourced from{' '}
          <strong>federal procurement databases</strong> and updated regularly. For official details, please visit SAM.gov
          or USASpending.gov directly.
        </p>
      </div>
    </div>
  )
}
