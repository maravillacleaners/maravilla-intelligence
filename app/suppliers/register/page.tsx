'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RegistrationData {
  // Company Info
  legal_name: string
  website?: string
  sub_category: string

  // Contact Info
  contact_name: string
  business_email: string
  phone: string
  password: string
  password_confirm: string

  // Services
  services_offered: string[]
  preferred_counties: string[]
  estimated_annual_capacity_usd?: number

  // Certifications
  certification_status?: string
  sam_gov_id?: string
  cage_code?: string
  insurance_certificate_url?: string

  // Legal
  agreed_terms: boolean
}

const SERVICES = ['Janitorial', 'Landscaping', 'HVAC', 'Painting', 'Construction']
const COUNTIES = ['Lee', 'Collier', 'Hillsborough', 'Polk', 'Pinellas', 'Duval', 'Miami-Dade']
const CATEGORIES = ['Service Provider', 'Vendor', 'Contractor', 'Equipment Supplier', 'Other']

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [data, setData] = useState<RegistrationData>({
    legal_name: '',
    website: '',
    sub_category: '',
    contact_name: '',
    business_email: '',
    phone: '',
    password: '',
    password_confirm: '',
    services_offered: [],
    preferred_counties: [],
    estimated_annual_capacity_usd: undefined,
    certification_status: '',
    sam_gov_id: '',
    cage_code: '',
    insurance_certificate_url: '',
    agreed_terms: false,
  })

  const updateData = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts editing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    if (!data.legal_name.trim()) {
      newErrors.legal_name = 'Company name is required'
    }
    if (!data.sub_category) {
      newErrors.sub_category = 'Category is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}
    if (!data.contact_name.trim()) {
      newErrors.contact_name = 'Contact name is required'
    }
    if (!data.business_email.trim() || !data.business_email.includes('@')) {
      newErrors.business_email = 'Valid email is required'
    }
    if (!data.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }
    if (!data.password || data.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    if (data.password !== data.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {}
    if (data.services_offered.length === 0) {
      newErrors.services_offered = 'Select at least one service'
    }
    if (data.preferred_counties.length === 0) {
      newErrors.preferred_counties = 'Select at least one county'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep5 = () => {
    const newErrors: Record<string, string> = {}
    if (!data.agreed_terms) {
      newErrors.agreed_terms = 'You must agree to the terms'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    // Validate current step
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 3 && !validateStep3()) return
    // Step 4 has no required validation, all fields optional
    if (step < 5) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep5()) return

    setLoading(true)
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Log the data (API endpoint will be created in Task 5)
      console.log('Submitting registration data:', data)

      // For now, generate a simple token (actual token will come from API in Task 5)
      const token = `supplier_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('supplier_token', token)
      localStorage.setItem('supplier_email', data.business_email)

      setSuccessMessage('✓ Registration successful! Redirecting to dashboard...')

      // Redirect after brief delay
      setTimeout(() => {
        router.push('/suppliers/dashboard')
      }, 1000)
    } catch (err) {
      setErrors({ submit: 'Registration failed. Please try again.' })
      setLoading(false)
    }
  }

  const toggleService = (service: string) => {
    updateData(
      'services_offered',
      data.services_offered.includes(service)
        ? data.services_offered.filter(s => s !== service)
        : [...data.services_offered, service]
    )
  }

  const toggleCounty = (county: string) => {
    updateData(
      'preferred_counties',
      data.preferred_counties.includes(county)
        ? data.preferred_counties.filter(c => c !== county)
        : [...data.preferred_counties, county]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto pt-8 pb-16">
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Supplier Registration</h1>
            <p className="text-gray-600">Join the Maravilla Network - Step {step} of 5</p>
          </div>

          {/* Step Indicator */}
          <div className="mb-8 flex gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  s <= step
                    ? s === step
                      ? 'bg-blue-600'
                      : 'bg-blue-300'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Step Labels */}
          <div className="mb-8 grid grid-cols-5 gap-2 text-center text-xs font-medium">
            {['Company', 'Contact', 'Services', 'Documents', 'Confirm'].map((label, i) => (
              <div
                key={label}
                className={`py-2 ${i + 1 <= step ? 'text-blue-600' : 'text-gray-500'}`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Step 1: Company Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Legal Name *
                </label>
                <input
                  type="text"
                  value={data.legal_name}
                  onChange={e => updateData('legal_name', e.target.value)}
                  placeholder="Enter your company's legal name"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.legal_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.legal_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.legal_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="text"
                  value={data.website || ''}
                  onChange={e => updateData('website', e.target.value)}
                  placeholder="https://www.example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={data.sub_category}
                  onChange={e => updateData('sub_category', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.sub_category ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.sub_category && (
                  <p className="text-red-600 text-sm mt-1">{errors.sub_category}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Contact Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  value={data.contact_name}
                  onChange={e => updateData('contact_name', e.target.value)}
                  placeholder="Full name"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contact_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.contact_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.contact_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Email *
                </label>
                <input
                  type="email"
                  value={data.business_email}
                  onChange={e => updateData('business_email', e.target.value)}
                  placeholder="hello@company.com"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.business_email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.business_email && (
                  <p className="text-red-600 text-sm mt-1">{errors.business_email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={e => updateData('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password (8+ characters) *
                </label>
                <input
                  type="password"
                  value={data.password}
                  onChange={e => updateData('password', e.target.value)}
                  placeholder="Enter password"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={data.password_confirm}
                  onChange={e => updateData('password_confirm', e.target.value)}
                  placeholder="Confirm password"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password_confirm ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.password_confirm && (
                  <p className="text-red-600 text-sm mt-1">{errors.password_confirm}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Services */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Services Offered *
                </label>
                <div className="space-y-2">
                  {SERVICES.map(service => (
                    <label key={service} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.services_offered.includes(service)}
                        onChange={() => toggleService(service)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{service}</span>
                    </label>
                  ))}
                </div>
                {errors.services_offered && (
                  <p className="text-red-600 text-sm mt-2">{errors.services_offered}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Preferred Service Areas (Counties) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COUNTIES.map(county => (
                    <label key={county} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.preferred_counties.includes(county)}
                        onChange={() => toggleCounty(county)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{county}</span>
                    </label>
                  ))}
                </div>
                {errors.preferred_counties && (
                  <p className="text-red-600 text-sm mt-2">{errors.preferred_counties}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Annual Capacity (USD)
                </label>
                <input
                  type="number"
                  value={data.estimated_annual_capacity_usd || ''}
                  onChange={e =>
                    updateData('estimated_annual_capacity_usd', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="100000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm mb-4">
                All fields on this step are optional. You can add documents later.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certification Status
                </label>
                <select
                  value={data.certification_status || ''}
                  onChange={e => updateData('certification_status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select status</option>
                  <option value="certified">Certified</option>
                  <option value="pending">Pending Certification</option>
                  <option value="not_certified">Not Certified</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SAM.gov ID
                </label>
                <input
                  type="text"
                  value={data.sam_gov_id || ''}
                  onChange={e => updateData('sam_gov_id', e.target.value)}
                  placeholder="SAM.gov entity identifier"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CAGE Code
                </label>
                <input
                  type="text"
                  value={data.cage_code || ''}
                  onChange={e => updateData('cage_code', e.target.value)}
                  placeholder="Commercial and Government Entity code"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Certificate URL
                </label>
                <input
                  type="url"
                  value={data.insurance_certificate_url || ''}
                  onChange={e => updateData('insurance_certificate_url', e.target.value)}
                  placeholder="https://example.com/certificate.pdf"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Registration Summary</h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Company</p>
                    <p className="font-medium text-gray-900">{data.legal_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Contact</p>
                    <p className="font-medium text-gray-900">{data.contact_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{data.business_email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{data.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Category</p>
                    <p className="font-medium text-gray-900">{data.sub_category}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Services</p>
                    <p className="font-medium text-gray-900">{data.services_offered.join(', ')}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Service Areas</p>
                    <p className="font-medium text-gray-900">{data.preferred_counties.join(', ')}</p>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.agreed_terms}
                  onChange={e => updateData('agreed_terms', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                />
                <span className="text-sm text-gray-700">
                  I agree to the Maravilla Network Supplier Terms and Conditions, Privacy Policy, and
                  Service Agreement. I confirm that all information provided is accurate and complete.
                </span>
              </label>
              {errors.agreed_terms && (
                <p className="text-red-600 text-sm">{errors.agreed_terms}</p>
              )}

              {errors.submit && (
                <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{errors.submit}</p>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex gap-4 justify-between">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                step === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Back
            </button>

            {step < 5 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`px-6 py-2 rounded-lg font-medium transition ${
                  loading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Submitting...' : 'Submit Registration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
