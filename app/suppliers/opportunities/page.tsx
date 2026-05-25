'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OpportunitiesPage() {
  const router = useRouter()
  const [opps, setOpps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('supplier_token')
    if (!token) {
      router.push('/suppliers/login')
      return
    }

    fetch('/api/suppliers/opportunities', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setOpps(data.opportunities || [])
        setLoading(false)
      })
      .catch((e) => {
        console.error(e)
        setLoading(false)
      })
  }, [router])

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Available Opportunities</h1>

      {loading ? (
        <p>Loading...</p>
      ) : opps.length === 0 ? (
        <p className="text-gray-500">No opportunities matched yet</p>
      ) : (
        <div className="grid gap-4">
          {opps.map((o: any) => (
            <div key={o.id} className="border rounded p-4 hover:shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold">{o.opportunity_name}</h3>
                <span className={`text-sm px-2 py-1 rounded ${o.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                  {o.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{o.agency}</p>
              <div className="flex justify-between text-sm">
                <span>${o.value?.toLocaleString()}</span>
                <span>Match: {o.match_score}%</span>
                <span>{o.deadline}</span>
              </div>
              <button className="mt-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                Apply
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
