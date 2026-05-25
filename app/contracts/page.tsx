'use client'

import { useEffect, useState } from 'react'

export default function ContractsPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/contracts')
      .then((r) => r.json())
      .then((data) => {
        setContracts(data.contracts || [])
        setLoading(false)
      })
      .catch((e) => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  const handleAutoMatch = async () => {
    const res = await fetch('/api/contracts/auto-match', { method: 'POST' })
    const data = await res.json()
    alert(`Matched ${data.matched} contracts to suppliers`)
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Federal Contracts</h1>

      <button
        onClick={handleAutoMatch}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        🔄 Auto-Match to Suppliers
      </button>

      {loading ? (
        <p>Loading contracts...</p>
      ) : (
        <div className="grid gap-4">
          {contracts.length === 0 ? (
            <p className="text-gray-500">No contracts found</p>
          ) : (
            contracts.map((c: any) => (
              <div key={c.id} className="border rounded p-4 hover:bg-gray-50">
                <h3 className="font-bold">{c.title}</h3>
                <p className="text-sm text-gray-600">{c.agency}</p>
                <p className="text-sm">
                  ${c.value?.toLocaleString()} • Deadline: {c.deadline}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  )
}
