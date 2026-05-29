# Maravilla Intelligence System - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and update:
```bash
cp .env.example .env
```

Key variables needed:
- `AIRTABLE_API_KEY` - Your Airtable API token
- `AIRTABLE_BASE_ID` - Intelligence base ID
- `AIRTABLE_SUBS_BASE_ID` - SUBS_STAGING base ID (appZhXnyFiKbnOZLr)
- `NEXT_PUBLIC_AIRTABLE_API_KEY` - Public API key for frontend
- `JWT_SECRET_SUPPLIER` - Secret for JWT token generation
- `SENDGRID_API_KEY` (optional) - For email notifications

### 3. Set Up Airtable Base

The SUBS_STAGING base must be created manually in Airtable with these tables:
- Suppliers (ID: tbl7NYtv13vA377a1)
- Supplier_Opportunities
- Supplier_Applications
- Communications

### 4. Initialize Fields

Start the development server:
```bash
npm run dev
```

Visit **http://localhost:3000/admin/setup** and click **"Setup Fields"**

This will automatically create all required fields in your Airtable base.

### 5. Test Supplier Registration

Visit **http://localhost:3000/suppliers/register** and complete the registration form.

---

## System Architecture

### Frontend
- **Next.js 16** with Turbopack
- **React 19** for UI components
- **Tailwind CSS** for styling

### Backend
- **Next.js API Routes** for REST endpoints
- **Airtable** for data persistence
- **JWT** for supplier authentication
- **bcryptjs** for password hashing

### Automation
- **Node Cron** for scheduled tasks (library, not running yet)
- **SendGrid** for email notifications (optional)
- **n8n** for workflow automation (JSON configs provided)

### Data Sources
- **SAM.gov API** - Federal contract opportunities
- **USASpending API** - Government spending awards
- **Sunbiz** - Florida business registrations (optional)

---

## Key Endpoints

### Supplier Management
- `POST /api/suppliers/register` - Register new supplier
- `POST /api/suppliers/login` - Authenticate supplier
- `GET /api/suppliers` - List all suppliers (admin)
- `GET /api/suppliers/opportunities/:id` - Get opportunities for supplier

### Contract Discovery
- `GET /api/contracts` - List all contracts
- `POST /api/contracts/auto-match` - Run contract matching algorithm

### Automation
- `POST /api/scrapers/sam-gov` - Trigger SAM.gov scraper
- `POST /api/scrapers/usaspending` - Trigger USASpending scraper
- `POST /api/notifications/send` - Send notifications to suppliers

### Admin
- `GET /api/admin/setup` - Check setup status
- `POST /api/admin/setup` - Run setup actions

---

## File Structure

```
app/
├── admin/
│   ├── setup/page.tsx              # Setup control panel
│   └── automation-status/page.tsx   # Monitor automations
├── api/
│   ├── admin/setup/route.ts         # Admin setup endpoints
│   ├── contracts/route.ts           # Contract management
│   ├── notifications/send/route.ts  # Email notifications
│   ├── scrapers/
│   │   ├── sam-gov/route.ts        # SAM.gov API endpoint
│   │   └── usaspending/route.ts    # USASpending API endpoint
│   ├── suppliers/
│   │   ├── register/route.ts       # Registration endpoint
│   │   ├── login/route.ts          # Authentication endpoint
│   │   └── opportunities/route.ts  # Opportunity listing
├── suppliers/
│   ├── register/page.tsx           # Registration form
│   ├── dashboard/page.tsx          # Supplier portal
│   └── opportunities/page.tsx      # Opportunity listing
└── contracts/page.tsx              # Contract discovery

lib/
├── suppliers-client.ts             # Airtable supplier queries
├── contract-matching.ts            # Matching algorithm
├── email-automation.ts             # SendGrid integration
├── scheduler.ts                    # Cron job definitions
├── setup-airtable-fields.ts        # Field initialization
├── scrapers/
│   ├── sam-gov-scraper.ts          # SAM.gov scraper
│   ├── usaspending-scraper.ts      # USASpending scraper
│   └── sunbiz-scraper.ts           # Florida business data

n8n-workflows/
├── flow-auto-discovery.json        # Contract discovery workflow
├── flow-auto-matching.json         # Auto-matching workflow
└── flow-auto-notifications.json    # Notification workflow
```

---

## Airtable Schema

### Suppliers Table (tbl7NYtv13vA377a1)
Essential fields:
- `legal_name` (text) - Company legal name
- `contact_name` (text) - Primary contact
- `business_email` (email) - Company email
- `phone` (phone) - Phone number
- `password_hash` (text) - Bcrypt hash
- `supplier_id` (text) - Unique ID
- `registration_status` (select) - Status: Pending Review, Approved, Active, Inactive
- `sub_category` (text) - Service category
- `website` (url) - Company website
- `notes` (multiline text) - Additional notes

Extended fields (auto-created):
- `services_offered` (multiselect)
- `preferred_counties` (multiselect)
- `certification_status` (select)
- `estimated_annual_capacity_usd` (currency)
- `registration_date` (date)
- `last_activity_date` (date)
- `availability_start_date` (date)

### Supplier_Opportunities Table
- `supplier_id` (text)
- `opportunity_id` (text)
- `opportunity_name` (text)
- `agency` (text)
- `contract_value_usd` (currency)
- `deadline` (date)
- `match_score` (number)
- `match_reason` (multiline text)
- `status` (select): Available, Applied, Declined, Selected, Won
- `date_matched` (date)
- `date_applied` (date)

### Communications Table
- `supplier_id` (text)
- `supplier_email` (email)
- `email_type` (select): Welcome, Opportunity Notification, Application Status, Other
- `email_subject` (text)
- `sent_date` (date)
- `open_status` (select): Sent, Opened, Clicked, Bounced

---

## Deployment

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```

Environment variables needed in Vercel dashboard:
- All `.env` variables

### Docker (Optional)
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Troubleshooting

### 401 Authentication Error
- Check `AIRTABLE_API_KEY` in `.env`
- Verify token has read/write access to both bases

### "Unknown field name" Errors
- Run field setup from `/admin/setup`
- Check Airtable base and table IDs match config

### Supplier Registration Failing
- Verify password meets requirements (8+ chars, mixed case, number)
- Check email format is valid
- Ensure supplier doesn't already exist

### Email Notifications Not Sending
- `SENDGRID_API_KEY` is optional (system logs instead if not set)
- To enable: add SendGrid API key to `.env`

---

## Next Steps

1. **Deploy to Vercel** - `vercel deploy`
2. **Configure n8n** - Import workflow JSON files
3. **Set up email domain** - Configure SendGrid sender
4. **Enable automations** - Start scheduler in production
5. **Monitor system** - Visit `/admin/automation-status`

---

## Support

For issues or questions:
1. Check logs in browser console (frontend) and server output (backend)
2. Verify environment variables in `.env`
3. Test endpoints directly via `/admin/setup`
4. Review Airtable base permissions
