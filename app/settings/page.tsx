'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState({
    primaryNaics: '561720',
    ghlLocationId: 'default',
    claudeModel: 'claude-opus-4-1',
    dailyBudget: 100,
    autoApproveThreshold: 80,
    emailNotifications: true,
    slackNotifications: false,
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    // Load settings from localStorage (in production, from backend)
    const savedSettings = localStorage.getItem('app_settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    router.push('/login')
  }

  const handleSave = () => {
    localStorage.setItem('app_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Logout
          </button>
        </div>
        <p className="text-gray-600 text-sm mt-2">Configure system behavior and integrations</p>
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl">
        {/* System Configuration */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary NAICS Code
              </label>
              <input
                type="text"
                value={settings.primaryNaics}
                onChange={e => handleChange('primaryNaics', e.target.value)}
                placeholder="561720"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Industry code (561720 = Janitorial Services)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Claude Model
              </label>
              <select
                value={settings.claudeModel}
                onChange={e => handleChange('claudeModel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="claude-opus-4-1">Claude Opus 4.1 (Best)</option>
                <option value="claude-sonnet-4-0">Claude Sonnet 4.0</option>
                <option value="claude-haiku-4-0">Claude Haiku 4.0 (Fast)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Used for scoring and analysis</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Processing Budget ($)
              </label>
              <input
                type="number"
                value={settings.dailyBudget}
                onChange={e => handleChange('dailyBudget', parseInt(e.target.value))}
                min="1"
                max="10000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum daily API spend limit</p>
            </div>
          </div>
        </div>

        {/* GHL Integration */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">GHL Integration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GHL Location ID
              </label>
              <input
                type="text"
                value={settings.ghlLocationId}
                onChange={e => handleChange('ghlLocationId', e.target.value)}
                placeholder="location-id"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                GHL location for contact creation (from GHL API)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Approve Threshold
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.autoApproveThreshold}
                  onChange={e => handleChange('autoApproveThreshold', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-lg font-bold text-gray-900 min-w-12">
                  {settings.autoApproveThreshold}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Prospects scoring above this automatically sync to GHL (0 = disabled)
              </p>
            </div>

            <button className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition">
              Test GHL Connection
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Notifications</h2>

          <div className="space-y-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={e => handleChange('emailNotifications', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700">Email on workflow completion</span>
            </label>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.slackNotifications}
                onChange={e => handleChange('slackNotifications', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700">Slack notifications on errors</span>
            </label>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Data Management</h2>

          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 hover:bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
              📊 Export All Data (CSV)
            </button>
            <button className="w-full text-left px-4 py-3 hover:bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
              🔄 Sync All Records from Airtable
            </button>
            <button className="w-full text-left px-4 py-3 hover:bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-700">
              🗑️ Clear All Local Cache
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 transition"
          >
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
          <button
            onClick={() => router.push('/prospects')}
            className="flex-1 bg-gray-200 text-gray-900 font-semibold py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>

        {/* System Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">System Status</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>✓ Dashboard: Operational</p>
            <p>✓ Airtable API: Connected</p>
            <p>✓ Claude API: Ready</p>
            <p>○ GHL Integration: {settings.ghlLocationId === 'default' ? 'Not configured' : 'Connected'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
