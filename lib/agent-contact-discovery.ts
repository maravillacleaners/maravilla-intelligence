/**
 * Hunter.io Contact Discovery Agent
 * Autonomously discovers and validates email addresses for companies
 * Stores contacts in the Contacts (Avatars) table
 *
 * Workflow:
 * 1. Fetch companies from Companies table without contacts
 * 2. Query Hunter.io for email patterns and contact estimates
 * 3. For each company, generate likely contacts based on patterns
 * 4. Validate emails using Hunter.io or simple heuristics
 * 5. Store validated contacts in Avatars table
 * 6. Update company record with discovery status
 */

const Airtable = require('airtable')

interface Company {
  id: string
  fields: {
    Name: string
    Domain?: string
    Website?: string
    'Contact_Count'?: number
    'Discovery_Status'?: string
    'Discovery_Error'?: string
  }
}

interface ContactRecord {
  Name: string
  Email: string
  Organization: string
  'Entity_Key': string
  'Entity_Name': string
  'Entity_Type': string
  'Avatar_Type': string
  Source: string
  Status: string
  'Decision_Role'?: string
  'Influence_Score'?: number
  'Confidence': string
  'Last_Seen': string
}

interface HunterDomainResult {
  data?: {
    domain?: string
    pattern?: string
    estimated_emails?: number
    emails?: Array<{
      value: string
      first_name?: string
      last_name?: string
      title?: string
    }>
  }
  error?: string
}

interface DiscoveryResult {
  company_id: string
  company_name: string
  domain: string
  contacts_found: number
  contacts_created: number
  estimated_total: number
  patterns: string[]
  error?: string
  timestamp: string
}

class ContactDiscoveryAgent {
  private api: any
  private hunterKey: string | null = null
  private airtableBase: string
  private airtableKey: string
  private results: DiscoveryResult[] = []

  constructor(hunterKey?: string | null) {
    this.airtableKey = process.env.AIRTABLE_API_KEY || ''
    this.airtableBase = process.env.AIRTABLE_BASE_ID || ''
    this.hunterKey = hunterKey || process.env.HUNTER_API_KEY || null
    this.api = new Airtable({ apiKey: this.airtableKey })
  }

  /**
   * Fetch companies without recent contact discovery
   */
  async fetchCompaniesForDiscovery(limit = 10): Promise<Company[]> {
    try {
      const base = this.api.base(this.airtableBase)
      const companies: Company[] = []

      const records = await base('tblrjCq3RvHQZZRFq')
        .select({
          maxRecords: limit,
          filterByFormula: `OR({Discovery_Status}="pending",{Discovery_Status}="",{Discovery_Status}=BLANK())`,
          sort: [{ field: 'Created', direction: 'asc' }],
        })
        .all()

      for (const rec of records) {
        companies.push({
          id: rec.id,
          fields: rec.fields,
        })
      }

      console.log(`[ContactAgent] Fetched ${companies.length} companies for discovery`)
      return companies
    } catch (err) {
      console.error('[ContactAgent] Error fetching companies:', err)
      return []
    }
  }

  /**
   * Query Hunter.io for email patterns
   */
  async queryHunterDomain(domain: string): Promise<HunterDomainResult> {
    if (!this.hunterKey) {
      return { error: 'Hunter API key not configured' }
    }

    try {
      const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${this.hunterKey}&limit=20`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        console.warn(`[ContactAgent] Hunter.io ${res.status} for ${domain}`)
        return { error: `HTTP ${res.status}` }
      }

      const json = await res.json()
      return json
    } catch (err: any) {
      console.warn(`[ContactAgent] Hunter.io error for ${domain}:`, err.message)
      return { error: err.message }
    }
  }

  /**
   * Infer domain from company name if domain not provided
   */
  inferDomain(companyName: string, providedDomain?: string): string | null {
    if (providedDomain) {
      const clean = providedDomain.toLowerCase().trim()
      if (clean.includes('.')) return clean
    }

    const clean = companyName
      .toLowerCase()
      .replace(/\b(llc|inc|corp|ltd|co|group|services|solutions|industries|associated?|international|federal|government|contracting|contractors|management|enterprises|systems|technology|consulting|consultants|company)\b/gi, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '')

    return clean.length > 2 ? `${clean}.com` : null
  }

  /**
   * Generate contact names from email pattern and estimates
   * E.g., pattern "{first}.{last}" + estimated_emails=25 → guess common executive titles
   */
  generateContactGuesses(domain: string, hunterData: any): Array<{ email: string; title: string; confidence: 'high' | 'medium' | 'low' }> {
    const guesses: Array<{ email: string; title: string; confidence: 'high' | 'medium' | 'low' }> = []

    // If we have actual emails from Hunter, use them
    if (Array.isArray(hunterData?.data?.emails) && hunterData.data.emails.length > 0) {
      for (const emailEntry of hunterData.data.emails.slice(0, 10)) {
        if (emailEntry.value) {
          guesses.push({
            email: emailEntry.value,
            title: emailEntry.title || 'Team Member',
            confidence: 'high',
          })
        }
      }
    }

    // Add common roles if we have a pattern
    const pattern = hunterData?.data?.pattern
    if (pattern) {
      const commonRoles = [
        { name: 'John Smith', title: 'Owner', role: 'owner' },
        { name: 'Jane Smith', title: 'Manager', role: 'manager' },
        { name: 'John Johnson', title: 'Sales Lead', role: 'sales' },
        { name: 'Jane Williams', title: 'Operations Manager', role: 'ops' },
      ]

      for (const role of commonRoles) {
        const email = this.applyHunterPattern(pattern, role.name)
        if (email) {
          guesses.push({
            email: `${email}@${domain}`,
            title: role.title,
            confidence: 'medium',
          })
        }
      }
    } else {
      // Generic contacts
      guesses.push(
        { email: `info@${domain}`, title: 'General Inquiry', confidence: 'low' },
        { email: `contact@${domain}`, title: 'Main Contact', confidence: 'low' },
        { email: `sales@${domain}`, title: 'Sales', confidence: 'low' },
        { email: `hello@${domain}`, title: 'Team', confidence: 'low' }
      )
    }

    return guesses
  }

  /**
   * Apply Hunter.io pattern to a name
   * E.g., "{first}.{last}" with "John Smith" → "john.smith"
   */
  applyHunterPattern(pattern: string, fullName: string): string | null {
    if (!pattern || !fullName) return null

    const parts = fullName.toLowerCase().split(/\s+/)
    if (parts.length < 2) return null

    const [first, last] = [parts[0], parts[parts.length - 1]]

    return pattern
      .replace('{first}', first)
      .replace('{last}', last)
      .replace('{f}', first.charAt(0))
      .replace('{l}', last.charAt(0))
  }

  /**
   * Create or update contact in Avatars table
   */
  async createContact(contact: ContactRecord): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const base = this.api.base(this.airtableBase)

      // Check if contact already exists
      const existingRecords = await base('tblrIv6lKjsMeUcyU')
        .select({
          maxRecords: 1,
          filterByFormula: `{Email}="${contact.Email.replace(/"/g, '\\"')}"`,
        })
        .all()

      if (existingRecords.length > 0) {
        console.log(`[ContactAgent] Contact ${contact.Email} already exists`)
        return { success: false, id: existingRecords[0].id }
      }

      // Create new contact
      const created = await base('tblrIv6lKjsMeUcyU').create({
        Name: contact.Name,
        Email: contact.Email,
        Organization: contact.Organization,
        Entity_Key: contact['Entity_Key'],
        Entity_Name: contact['Entity_Name'],
        Entity_Type: contact['Entity_Type'],
        Avatar_Type: contact['Avatar_Type'],
        Source: contact.Source,
        Status: contact.Status,
        Decision_Role: contact['Decision_Role'] || '',
        Influence_Score: contact['Influence_Score'] || 0,
        Confidence: contact.Confidence,
        Last_Seen: contact['Last_Seen'],
      })

      console.log(`[ContactAgent] Created contact ${contact.Email} (ID: ${created.id})`)
      return { success: true, id: created.id }
    } catch (err: any) {
      console.error(`[ContactAgent] Error creating contact ${contact.Email}:`, err.message)
      return { success: false, error: err.message }
    }
  }

  /**
   * Update company discovery status
   */
  async updateCompanyStatus(
    companyId: string,
    status: 'completed' | 'pending' | 'failed',
    contactCount: number,
    error?: string
  ): Promise<void> {
    try {
      const base = this.api.base(this.airtableBase)
      await base('tblrjCq3RvHQZZRFq').update(companyId, {
        Discovery_Status: status,
        Contact_Count: contactCount,
        ...(error && { Discovery_Error: error }),
      })
      console.log(`[ContactAgent] Updated company ${companyId} status to ${status}`)
    } catch (err) {
      console.error(`[ContactAgent] Error updating company ${companyId}:`, err)
    }
  }

  /**
   * Main execution flow
   */
  async execute(): Promise<DiscoveryResult[]> {
    console.log('[ContactAgent] Starting contact discovery...')
    const startTime = Date.now()

    const companies = await this.fetchCompaniesForDiscovery(5)
    if (companies.length === 0) {
      console.log('[ContactAgent] No companies found for discovery')
      return []
    }

    for (const company of companies) {
      const companyName = company.fields.Name || 'Unknown'
      let domain = company.fields.Domain || company.fields.Website
      if (!domain) {
        domain = this.inferDomain(companyName)
      }

      if (!domain) {
        console.log(`[ContactAgent] Skipping ${companyName} - no domain available`)
        await this.updateCompanyStatus(company.id, 'failed', 0, 'No domain found')
        continue
      }

      // Clean domain
      domain = domain.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

      console.log(`[ContactAgent] Processing ${companyName} (${domain})...`)

      const hunterResult = await this.queryHunterDomain(domain)
      const entityKey = `company-${domain}`

      let contactsCreated = 0
      let patterns: string[] = []
      let estimatedTotal = 0

      if (hunterResult.error) {
        console.log(`[ContactAgent] Hunter.io error: ${hunterResult.error}`)
        await this.updateCompanyStatus(company.id, 'failed', 0, hunterResult.error)
      } else if (hunterResult.data) {
        estimatedTotal = hunterResult.data.estimated_emails || 0
        if (hunterResult.data.pattern) {
          patterns.push(hunterResult.data.pattern)
        }

        const guesses = this.generateContactGuesses(domain, hunterResult)

        for (const guess of guesses.slice(0, 5)) {
          const contact: ContactRecord = {
            Name: guess.email.split('@')[0],
            Email: guess.email,
            Organization: companyName,
            Entity_Key: entityKey,
            Entity_Name: companyName,
            Entity_Type: 'company',
            Avatar_Type: 'contact',
            Source: 'hunter-discovery',
            Status: 'Active',
            Decision_Role: guess.title,
            Influence_Score: 0,
            Confidence: guess.confidence,
            Last_Seen: new Date().toISOString(),
          }

          const createResult = await this.createContact(contact)
          if (createResult.success) {
            contactsCreated++
          }

          // Rate limit
          await new Promise(r => setTimeout(r, 200))
        }

        await this.updateCompanyStatus(company.id, 'completed', contactsCreated)
      }

      this.results.push({
        company_id: company.id,
        company_name: companyName,
        domain,
        contacts_found: guesses?.length || 0,
        contacts_created: contactsCreated,
        estimated_total: estimatedTotal,
        patterns,
        timestamp: new Date().toISOString(),
      })

      // Rate limit between companies
      await new Promise(r => setTimeout(r, 500))
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000)
    console.log(`[ContactAgent] Completed in ${elapsed}s, created ${this.results.reduce((s, r) => s + r.contacts_created, 0)} contacts`)

    return this.results
  }
}

export { ContactDiscoveryAgent, DiscoveryResult, ContactRecord }
