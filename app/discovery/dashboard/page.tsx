'use client'

import { useEffect, useState } from 'react'

interface DashboardStats {
  watches: { active: number; totalRuns: number; successRate: number }
  recentMatches: { autoApproved: number; queued: number; dropped: number }
  leadsCreated: { total: number; last24h: number; last7d: number }
  automationHealth: { lastRun: string | null; nextRun: string; uptime: boolean }
}

export default function DiscoveryDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/discovery/dashboard')
        const data = await res.json()
        setStats(data.data)
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (!stats) return <div className="p-8">Error loading dashboard</div>

  const totalMatches = stats.recentMatches.autoApproved + stats.recentMatches.queued + stats.recentMatches.dropped
  const autoApprovePercentage = totalMatches > 0 ? (stats.recentMatches.autoApproved / totalMatches) * 100 : 0
  const queuePercentage = totalMatches > 0 ? (stats.recentMatches.queued / totalMatches) * 100 : 0
  const dropPercentage = totalMatches > 0 ? (stats.recentMatches.dropped / totalMatches) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Discovery Watch Automation Dashboard
          </h1>
          <p className="text-slate-400">
            Real-time monitoring of watch execution, lead generation, and automation health
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm font-medium mb-2">ACTIVE WATCHES</div>
            <div className="text-4xl font-bold text-emerald-400">{stats.watches.active}</div>
            <div className="text-slate-500 text-xs mt-2">{stats.watches.totalRuns} total runs</div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm font-medium mb-2">SUCCESS RATE</div>
            <div className="text-4xl font-bold text-blue-400">{stats.watches.successRate.toFixed(0)}%</div>
            <div className="text-slate-500 text-xs mt-2">{stats.watches.totalRuns} automation runs</div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm font-medium mb-2">LEADS (24H)</div>
            <div className="text-4xl font-bold text-amber-400">{stats.leadsCreated.last24h}</div>
            <div className="text-slate-500 text-xs mt-2">{stats.leadsCreated.total} total</div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm font-medium mb-2">STATUS</div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${stats.automationHealth.uptime ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
              <div className="text-xl font-bold text-white">{stats.automationHealth.uptime ? 'Online' : 'Offline'}</div>
            </div>
            <div className="text-slate-500 text-xs mt-2">Runs every 6 hours</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Recent Match Distribution</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-slate-400 text-sm mb-2">Auto-Approved (≥75pts)</div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${autoApprovePercentage}%` }}></div>
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{stats.recentMatches.autoApproved}</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-slate-400 text-sm mb-2">Queued (55–74pts)</div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${queuePercentage}%` }}></div>
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-400">{stats.recentMatches.queued}</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-slate-400 text-sm mb-2">Dropped (&lt;55pts)</div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-600" style={{ width: `${dropPercentage}%` }}></div>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-400">{stats.recentMatches.dropped}</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-6">Automation Schedule</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-slate-400 text-sm mb-2">LAST RUN</div>
              <div className="text-lg font-mono text-slate-300">
                {stats.automationHealth.lastRun ? new Date(stats.automationHealth.lastRun).toLocaleString() : 'Never'}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-2">NEXT SCHEDULED RUN</div>
              <div className="text-lg font-mono text-slate-300">
                {new Date(stats.automationHealth.nextRun).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
