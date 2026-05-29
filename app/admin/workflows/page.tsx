'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function WorkflowsPage() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const workflows = [
    {
      id: 'sam-gov-scraper',
      name: 'SAM.gov Contract Scraper',
      description: 'Automatically scrapes SAM.gov for federal opportunities',
      schedule: 'Every 6 hours',
      icon: '🔍',
      color: 'blue',
    },
    {
      id: 'usaspending-scraper',
      name: 'USASpending Awards Scraper',
      description: 'Fetches government spending awards data',
      schedule: 'Daily at 2 AM',
      icon: '💰',
      color: 'green',
    },
    {
      id: 'contract-matcher',
      name: 'Contract Matching Engine',
      description: 'Matches contracts to qualified suppliers',
      schedule: 'Hourly',
      icon: '🎯',
      color: 'purple',
    },
    {
      id: 'notifier',
      name: 'Supplier Notifications',
      description: 'Sends opportunity notifications to suppliers',
      schedule: 'Every 6 hours',
      icon: '📧',
      color: 'orange',
    },
  ]

  const handleTriggerWorkflow = async (workflowId: string) => {
    setLoading(true)
    setStatus(`Triggering ${workflowId}...`)

    try {
      const response = await fetch('/api/workflows/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus(`✅ ${workflowId} started successfully`)
      } else {
        setStatus(`❌ Error: ${data.message}`)
      }
    } catch (error) {
      setStatus(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/setup" className="text-blue-600 hover:text-blue-700 text-sm">
          ← Back to Setup
        </Link>
        <h1 className="text-3xl font-bold mt-4">Workflows</h1>
        <p className="text-gray-600 mt-2">Manage n8n automation workflows</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️</strong> These workflows automate contract discovery, matching, and notifications.
          Ensure n8n is running at the configured URL.
        </p>
      </div>

      <div className="grid gap-6">
        {workflows.map(workflow => (
          <div
            key={workflow.id}
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <span className="text-3xl">{workflow.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                  <p className="text-gray-600 text-sm">{workflow.description}</p>
                  <p className="text-gray-500 text-xs mt-2">Schedule: {workflow.schedule}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-semibold text-white bg-${workflow.color}-600`}>
                Active
              </span>
            </div>

            <button
              onClick={() => handleTriggerWorkflow(workflow.id)}
              disabled={loading}
              className={`px-4 py-2 rounded text-sm font-semibold text-white transition ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : `bg-${workflow.color}-600 hover:bg-${workflow.color}-700`
              }`}
            >
              {loading ? 'Running...' : 'Trigger Now'}
            </button>
          </div>
        ))}
      </div>

      {status && (
        <div
          className={`rounded p-4 ${
            status.startsWith('✅')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {status}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded p-6">
        <h2 className="text-lg font-bold mb-4">Configuration</h2>
        <div className="space-y-2 text-sm">
          <p>
            <strong>n8n URL:</strong>{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">
              {process.env.N8N_WEBHOOK_URL || 'http://localhost:5678'}
            </code>
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Update N8N_WEBHOOK_URL in .env to point to your n8n instance
          </p>
        </div>
      </div>
    </div>
  )
}
