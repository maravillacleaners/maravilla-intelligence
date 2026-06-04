'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AgentStatus {
  agent_id: string
  name: string
  status: 'active' | 'pending' | 'error' | 'disabled'
  last_run?: string
  next_run?: string
  records_processed?: number
  errors?: number
  endpoint: string
  schedule?: string
}

interface StatusResponse {
  success: boolean
  summary: {
    total_agents: number
    active: number
    pending: number
    errors: number
    disabled: number
    total_records_processed: number
    total_errors: number
    last_check: string
  }
  agents: AgentStatus[]
  timestamp: string
}

export default function AgentsMonitorPage() {
  const router = useRouter()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  // Fetch agent status
  const fetchStatus = async () => {
    try {
      const url = `/api/agents/status?detail=true${filter ? `&status=${filter}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      setStatus(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch status:', error)
      setLoading(false)
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchStatus()
    if (!autoRefresh) return

    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, filter])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          Loading agent status...
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center text-red-400">Failed to load agent status</div>
      </div>
    )
  }

  const { summary, agents } = status

  const statusColors = {
    active: 'bg-green-900 text-green-100 border-green-500',
    pending: 'bg-yellow-900 text-yellow-100 border-yellow-500',
    error: 'bg-red-900 text-red-100 border-red-500',
    disabled: 'bg-gray-700 text-gray-100 border-gray-500',
  }

  const statusIcons = {
    active: '✅',
    pending: '⏳',
    error: '❌',
    disabled: '⛔',
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🤖 Autonomous Agents Monitor</h1>
          <p className="text-gray-400">Real-time status of data collection & enrichment agents</p>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded ${autoRefresh ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}
          >
            {autoRefresh ? '⏸ Auto-Refresh ON' : '▶ Auto-Refresh OFF'}
          </button>
          <button
            onClick={fetchStatus}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
          >
            🔄 Refresh Now
          </button>
          <select
            value={filter || ''}
            onChange={(e) => setFilter(e.target.value || null)}
            className="px-4 py-2 rounded bg-gray-700 text-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="error">Error</option>
            <option value="pending">Pending</option>
          </select>
          <span className="ml-auto text-gray-400 text-sm">
            Last updated: {new Date(status.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 p-4 rounded">
            <div className="text-2xl font-bold text-green-400">{summary.active}</div>
            <div className="text-sm text-gray-400">Active Agents</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 p-4 rounded">
            <div className="text-2xl font-bold text-red-400">{summary.errors}</div>
            <div className="text-sm text-gray-400">With Errors</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 p-4 rounded">
            <div className="text-2xl font-bold text-blue-400">{summary.total_records_processed}</div>
            <div className="text-sm text-gray-400">Records Processed</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 p-4 rounded">
            <div className="text-2xl font-bold text-yellow-400">{summary.total_errors}</div>
            <div className="text-sm text-gray-400">Total Errors</div>
          </div>
        </div>

        {/* Agents List */}
        <div className="space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.agent_id}
              className={`border-l-4 p-6 rounded ${statusColors[agent.status]} transition-all hover:shadow-lg`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{statusIcons[agent.status]}</span>
                    <div>
                      <h3 className="text-xl font-bold">{agent.name}</h3>
                      <p className="text-sm opacity-75">{agent.agent_id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <div className="opacity-75">Schedule</div>
                      <div className="font-mono">{agent.schedule || 'Manual'}</div>
                    </div>
                    <div>
                      <div className="opacity-75">Last Run</div>
                      <div className="font-mono">
                        {agent.last_run
                          ? new Date(agent.last_run).toLocaleString()
                          : 'Never'}
                      </div>
                    </div>
                    <div>
                      <div className="opacity-75">Next Run</div>
                      <div className="font-mono">
                        {agent.next_run
                          ? new Date(agent.next_run).toLocaleString()
                          : 'Not scheduled'}
                      </div>
                    </div>
                    <div>
                      <div className="opacity-75">Records</div>
                      <div className="font-mono">{agent.records_processed || 0}</div>
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <button
                    onClick={() => {/* TODO: Trigger manual run */}}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-sm"
                  >
                    Run Now
                  </button>
                </div>
              </div>

              {agent.errors && agent.errors > 0 && (
                <div className="mt-4 p-3 bg-red-950 rounded text-sm">
                  <strong>Errors:</strong> {agent.errors} error(s) in last run
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Agents auto-refresh every 30 seconds | All data source integrations active</p>
          <p className="mt-2">
            <a href="/intelligence" className="text-blue-400 hover:text-blue-300">
              ← Back to Intelligence Dashboard
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
