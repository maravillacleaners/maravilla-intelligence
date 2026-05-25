'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface WorkflowRun {
  id: string
  workflow: string
  status: 'success' | 'failed' | 'running'
  recordsProcessed: number
  recordsAdded: number
  timestamp: string
  duration: number
  errorMessage?: string
}

export default function RunsPage() {
  const router = useRouter()
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    // Mock data - in production, this would come from n8n API or database
    const mockRuns: WorkflowRun[] = [
      {
        id: 'run-001',
        workflow: 'Flow C - Federal Contracts',
        status: 'success',
        recordsProcessed: 42,
        recordsAdded: 8,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        duration: 145,
      },
      {
        id: 'run-002',
        workflow: 'Flow A - Client Discovery',
        status: 'success',
        recordsProcessed: 127,
        recordsAdded: 23,
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        duration: 312,
      },
      {
        id: 'run-003',
        workflow: 'Flow B - Subcontractor Discovery',
        status: 'success',
        recordsProcessed: 89,
        recordsAdded: 15,
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        duration: 287,
      },
      {
        id: 'run-004',
        workflow: 'Flow D - Compliance Check',
        status: 'failed',
        recordsProcessed: 45,
        recordsAdded: 0,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        duration: 23,
        errorMessage: 'API timeout on FOIA validation service',
      },
    ]

    setRuns(mockRuns)
    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    router.push('/login')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading workflow runs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Workflow Executions</h1>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Logout
          </button>
        </div>
        <p className="text-gray-600 text-sm mt-2">{runs.length} recent workflow runs</p>
      </div>

      {/* Content */}
      <div className="p-4 grid grid-cols-3 gap-4">
        {/* List */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200 max-h-[calc(100vh-150px)] overflow-y-auto">
              {runs.map(run => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                    selectedRun?.id === run.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className="font-semibold text-gray-900 text-sm">{run.workflow}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(run.status)}`}>
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(run.timestamp).toLocaleDateString()} {new Date(run.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="col-span-2">
          {selectedRun ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedRun.workflow}</h2>

              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className={`text-sm font-bold px-4 py-2 rounded-full ${getStatusColor(selectedRun.status)}`}>
                    {selectedRun.status.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600">
                    Execution ID: <span className="font-mono text-gray-900">{selectedRun.id}</span>
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Processed</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {selectedRun.recordsProcessed}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">records</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Added</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    +{selectedRun.recordsAdded}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">to database</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {selectedRun.duration}s
                  </p>
                  <p className="text-xs text-gray-500 mt-1">execution time</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Execution Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Started:</span>{' '}
                    {new Date(selectedRun.timestamp).toLocaleString()}
                  </p>
                  <p className="mt-2">
                    <span className="font-medium">Success Rate:</span>{' '}
                    {((selectedRun.recordsAdded / selectedRun.recordsProcessed) * 100).toFixed(1)}%
                  </p>
                  {selectedRun.errorMessage && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                      <p className="font-medium text-sm">Error</p>
                      <p className="text-sm mt-1">{selectedRun.errorMessage}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition">
                  View Full Log
                </button>
                <button className="flex-1 bg-gray-200 text-gray-900 font-semibold py-2 rounded-lg hover:bg-gray-300 transition">
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-gray-600">Select a workflow run to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
