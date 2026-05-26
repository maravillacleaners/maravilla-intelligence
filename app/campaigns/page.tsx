'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: 'prospect' | 'contract' | 'sub'
  variables?: string[]
}

interface Campaign {
  id: string
  name: string
  templateId: string
  recipientCount: number
  status: 'draft' | 'scheduled' | 'running' | 'completed'
  sentCount: number
  openCount: number
  clickCount: number
  createdAt: string
}

type Step = 'select-recipients' | 'select-template' | 'preview' | 'send'

export default function CampaignsPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('select-recipients')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState('')

  // Form state
  const [campaignName, setCampaignName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'prospect' | 'contract' | 'sub'>('prospect')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [allProspects, setAllProspects] = useState<any[]>([])
  const [sendingProgress, setSendingProgress] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch templates
        const templateRes = await fetch(`/api/templates?category=${selectedCategory}`)
        const templateData = await templateRes.json()
        setTemplates(templateData.templates || [])

        // Fetch prospects
        const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
        const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

        const prospectsRes = await fetch(
          `https://api.airtable.com/v0/${baseId}/Intelligence?filterByFormula={record_type}='prospect'`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
          }
        )

        const prospectsData = await prospectsRes.json()
        const prospects = (prospectsData.records || []).map((r: any) => ({
          id: r.id,
          name: r.fields.legal_name || 'Unknown',
          email: r.fields.business_email || 'N/A',
          score: r.fields.score || 0,
        }))

        setAllProspects(prospects)
      } catch (err) {
        console.error('Error fetching data:', err)
        setToastMessage('Error loading data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, selectedCategory])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    router.push('/login')
  }

  const handleCreateCampaign = async () => {
    if (!campaignName || !selectedTemplate || selectedRecipients.length === 0) {
      setToastMessage('Please fill all required fields')
      return
    }

    try {
      setSendingProgress(10)

      // Create campaign
      const campaignRes = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          templateId: selectedTemplate.id,
          recipientRecordIds: selectedRecipients,
        }),
      })

      const campaignData = await campaignRes.json()
      if (!campaignData.success) throw new Error(campaignData.error)

      setSendingProgress(50)

      // Send emails
      const sendRes = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaignData.campaign.id,
          templateId: selectedTemplate.id,
          recipients: campaignData.campaign.recipients,
        }),
      })

      const sendData = await sendRes.json()
      setSendingProgress(100)

      setToastMessage(
        `✓ Campaign sent! ${sendData.sent} successful, ${sendData.failed} failed`
      )

      // Reset form
      setTimeout(() => {
        setCampaignName('')
        setSelectedTemplate(null)
        setSelectedRecipients([])
        setStep('select-recipients')
        setSendingProgress(0)
      }, 2000)
    } catch (error) {
      console.error('Error creating campaign:', error)
      setToastMessage('✗ Failed to send campaign')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading campaigns...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Email Campaigns</h1>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Logout
          </button>
        </div>
        <p className="text-gray-600 text-sm mt-2">Create and manage outreach campaigns</p>
      </div>

      {/* Content */}
      <div className="p-4 max-w-4xl mx-auto">
        {/* Campaign Builder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign Builder</h2>

          {/* Step Indicator */}
          <div className="flex gap-2 mb-6">
            {(['select-recipients', 'select-template', 'preview', 'send'] as Step[]).map(
              (s, i) => (
                <div
                  key={s}
                  className={`flex-1 py-2 px-3 rounded text-center text-sm font-medium transition ${
                    step === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200'
                  }`}
                  onClick={() => setStep(s)}
                >
                  {i + 1}. {s.split('-').join(' ')}
                </div>
              )
            )}
          </div>

          {/* Step 1: Select Recipients */}
          {step === 'select-recipients' && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Select Recipients</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="e.g., 'Federal Prospects - May 2026'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Type
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="prospect">Prospects (Commercial Leads)</option>
                  <option value="contract">Contracts (Federal Opportunities)</option>
                  <option value="sub">Subcontractors (Teaming Partners)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Recipients ({selectedRecipients.length} selected)
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                  {allProspects.length === 0 ? (
                    <p className="text-gray-500 text-sm">No prospects found</p>
                  ) : (
                    allProspects.map(prospect => (
                      <label key={prospect.id} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(prospect.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedRecipients([...selectedRecipients, prospect.id])
                            } else {
                              setSelectedRecipients(
                                selectedRecipients.filter(id => id !== prospect.id)
                              )
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        />
                        <span className="ml-2 text-sm text-gray-700">{prospect.name}</span>
                        <span className="ml-auto text-xs text-gray-500">{prospect.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={() => setStep('select-template')}
                disabled={!campaignName || selectedRecipients.length === 0}
                className="mt-6 w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                Next: Select Template
              </button>
            </div>
          )}

          {/* Step 2: Select Template */}
          {step === 'select-template' && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Select Email Template</h3>

              <div className="space-y-3 mb-6">
                {templates.length === 0 ? (
                  <p className="text-gray-500">No templates available for this category</p>
                ) : (
                  templates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{template.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Variables: {(template.variables ?? []).join(', ')}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('select-recipients')}
                  className="flex-1 bg-gray-200 text-gray-900 font-semibold py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('preview')}
                  disabled={!selectedTemplate}
                  className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  Next: Preview
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && selectedTemplate && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Preview Email</h3>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                <div className="bg-white p-4 rounded">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>From:</strong> Commercial Intelligence Team
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    <strong>Subject:</strong> {selectedTemplate.subject}
                  </p>
                  <div className="border-t pt-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedTemplate.body}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                This email will be sent to <strong>{selectedRecipients.length} recipients</strong>
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('select-template')}
                  className="flex-1 bg-gray-200 text-gray-900 font-semibold py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('send')}
                  className="flex-1 bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Send Campaign
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Send Progress */}
          {step === 'send' && (
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-6">Sending Campaign...</h3>

              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${sendingProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{sendingProgress}%</p>
              </div>

              {sendingProgress === 100 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">✓ Campaign sent successfully!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
