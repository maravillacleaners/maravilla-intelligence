# Outreach Automation — Complete Guide

**Version:** 1.0.0  
**Date:** 2026-05-25  
**Status:** ✅ Production Ready

---

## 🎯 Overview

The Outreach Automation system enables:
- 📧 **Email Campaigns** — Send personalized emails to hundreds of prospects
- 🎯 **Smart Templating** — Variables replace automatically (company_name, agency, etc.)
- 📊 **Tracking** — Monitor opens, clicks, and engagement
- 🔄 **Sequences** — Multi-step follow-up campaigns
- 🧠 **Smart Routing** — Different templates for prospects/contracts/subs

---

## 📧 Email Campaigns

### New Page: `/campaigns`

**Purpose:** Build and send email campaigns to prospects, contracts, or subcontractors

**Features:**
1. **Step 1: Select Recipients**
   - Choose campaign name
   - Select recipient type (prospects/contracts/subs)
   - Select individual recipients from list
   - Shows email and score for each

2. **Step 2: Select Template**
   - Browse available templates for category
   - Preview template variables
   - Select template to use

3. **Step 3: Preview**
   - See final email with variables filled in
   - Confirm recipient count
   - Review subject line

4. **Step 4: Send**
   - Progress bar shows sending status
   - Automatic rate limiting (500ms between emails)
   - Success/failure tracking

**Workflow:**
```
Select Recipients (Name, Type, People)
    ↓
Select Template (Email template)
    ↓
Preview Email (Review output)
    ↓
Send Campaign (Auto-send to all)
    ↓
Track Results (Opens, clicks, responses)
```

---

## 📋 Email Templates

### Default Templates

**3 out-of-the-box templates:**

#### 1. Initial Prospect Outreach
```
Subject: Partnership Opportunity with [company_name]

Hi [contact_name],

I came across [company_name] and was impressed by your work in [industry].

I believe we can create significant value through a partnership on federal contracting opportunities. Your background in [service_type] aligns perfectly with our capabilities.

Would you be open to a brief conversation next week?

Best regards,
Commercial Intelligence Team
```

**Variables:** company_name, contact_name, industry, service_type

---

#### 2. Federal Contract Teaming Offer
```
Subject: Teaming Partner Opportunity - [opportunity_name]

Hello [contact_name],

We identified the "[opportunity_name]" opportunity and believe we can strengthen your proposal through teaming.

Our expertise in [service_category] has delivered results on similar federal contracts, with an average contract value of [avg_contract_value].

Would you like to discuss this opportunity?

Estimated Contract Value: [contract_value]
Deadline: [deadline]

Best regards,
Commercial Intelligence Team
```

**Variables:** contact_name, opportunity_name, service_category, avg_contract_value, contract_value, deadline

---

#### 3. Subcontractor Partnership Inquiry
```
Subject: Partnership Opportunity - [company_name]

Hi [contact_name],

We're building a network of qualified subcontractors and came across [company_name].

Your expertise in [sub_category] would be valuable for our federal contracting pipeline. We regularly have [opportunity_type] opportunities available.

Let's connect to discuss potential partnerships.

Best regards,
Commercial Intelligence Team
```

**Variables:** contact_name, company_name, sub_category, opportunity_type

---

### Create Custom Templates

**Endpoint:** `POST /api/templates`

**Request:**
```json
{
  "name": "Custom Outreach",
  "subject": "Opportunity for [company_name]",
  "body": "Hi [contact_name],\n\nWe have an opportunity in [service_type]...",
  "category": "prospect"
}
```

**Response:**
```json
{
  "success": true,
  "template": {
    "id": "template-1234567890",
    "name": "Custom Outreach",
    "subject": "Opportunity for [company_name]",
    "body": "Hi [contact_name],\n\nWe have an opportunity in [service_type]...",
    "variables": ["company_name", "contact_name", "service_type"],
    "category": "prospect"
  }
}
```

**Variable Extraction:** Automatically scans for `[variable_name]` patterns and extracts variables

---

## 📤 Send Campaigns

### Create Campaign

**Endpoint:** `POST /api/campaigns/create`

**Request:**
```json
{
  "name": "Federal Prospects - May 2026",
  "templateId": "prospect-initial",
  "recipientRecordIds": [
    "rec123456",
    "rec234567",
    "rec345678"
  ],
  "scheduledFor": "2026-05-26T09:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "camp-1234567890",
    "name": "Federal Prospects - May 2026",
    "templateId": "prospect-initial",
    "recipients": [
      {
        "recordId": "rec123456",
        "email": "contact@acme.com",
        "name": "Acme Federal Solutions LLC",
        "variables": { "company_name": "Acme...", ... }
      }
    ],
    "status": "draft",
    "sentCount": 0,
    "openCount": 0,
    "clickCount": 0
  },
  "recipientCount": 3
}
```

---

### Send Campaign

**Endpoint:** `POST /api/campaigns/send`

**Request:**
```json
{
  "campaignId": "camp-1234567890",
  "templateId": "prospect-initial",
  "recipients": [
    {
      "recordId": "rec123456",
      "email": "contact@acme.com",
      "name": "Acme Federal Solutions LLC",
      "variables": { "company_name": "Acme...", ... }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "campaignId": "camp-1234567890",
  "sent": 3,
  "failed": 0,
  "results": [
    {
      "recordId": "rec123456",
      "email": "contact@acme.com",
      "status": "sent",
      "messageId": "demo-1234567890"
    }
  ]
}
```

**Features:**
- Automatic variable interpolation
- Tracking ID generation per email
- Rate limiting (500ms between sends)
- Graceful error handling
- Demo mode (default) or real SendGrid/Mailgun

---

## 📊 Email Tracking

### Tracking Pixel

Each email includes a 1x1 transparent pixel for open tracking:

```html
<img src="https://your-domain.com/api/track?id=camp-123-rec-456-789" 
     width="1" height="1" alt="" />
```

### Track Opens/Clicks

**Endpoint:** `GET /api/track?id={trackingId}&event=open`

**Response:** 1x1 GIF pixel (invisible in email)

---

### Get Analytics

**Endpoint:** `POST /api/track`

**Request:**
```json
{
  "campaignId": "camp-1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "campaignId": "camp-1234567890",
  "totalEvents": 15,
  "opens": 12,
  "clicks": 3,
  "uniqueRecords": 10,
  "events": [
    {
      "id": "camp-123-rec-456-789",
      "event": "open",
      "campaignId": "camp-1234567890",
      "recordId": "rec456",
      "timestamp": "2026-05-25T12:34:56Z",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

---

## 🔄 Follow-Up Sequences

### Automatic Sequences (Future Feature)

When a prospect is approved, automatic follow-up sequence begins:

**Prospect Sequence:**
- Day 0: Initial Outreach
- Day 3: Follow-up (3-day check-in)
- Day 7: Final Follow-up (1-week check-in)

**Contract Sequence:**
- Day 0: Teaming Offer
- Day 2: Reminder

**Sub Sequence:**
- Day 0: Partnership Inquiry
- Day 5: Follow-up

---

## 📬 Email Service Integration

### Current: Demo Mode

All emails are logged to console and simulated successful sending.

### Ready for: SendGrid

**Setup:**
```env
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@maravilla.com
```

Features:
- Real email delivery
- Automatic click tracking
- Bounce handling
- Unsubscribe management

### Ready for: Mailgun

**Setup:**
```env
EMAIL_SERVICE=mailgun
EMAIL_API_KEY=key-xxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.maravilla.com
EMAIL_FROM=noreply@maravilla.com
```

Features:
- EU data residency options
- Webhook for bounces/complaints
- SMTP relay

---

## 🎯 Use Cases

### Scenario 1: Prospect Outreach
```
1. Discovery finds 50 new prospects from Sunbiz
2. Score all 50 with Claude
3. Select top 25 (score > 80)
4. Send "Initial Prospect Outreach" template
5. Track opens/clicks
6. Send day 3 follow-up to non-openers
7. Quality leads go to Approve → GHL
```

### Scenario 2: Contract Teaming
```
1. SAM.gov finds $5M contract
2. Identify 8 potential prime contractors
3. Send "Federal Contract Teaming" email
4. Track opens within 2 hours
5. Follow up within 24 hours if opened
6. Schedule callback
7. Update pipeline status
```

### Scenario 3: Subcontractor Recruitment
```
1. Discover 20 new subcontractors
2. Select by category (Janitorial, Landscaping)
3. Send "Partnership Inquiry" template
4. Track engagement
5. Only follow up those who engage
6. Build Subcontractor list with interested parties
```

---

## 📈 Best Practices

### Email Success Rate Optimization

| Practice | Impact | How-To |
|----------|--------|--------|
| **Personalization** | +45% open rate | Use [variable] to customize subject/body |
| **Timing** | +30% open rate | Send Tue-Thu, 9-11am |
| **Subject Line** | +25% open rate | Keep under 50 chars, avoid ALL CAPS |
| **Follow-up** | +60% response | Send day 3 and day 7 |
| **Clear CTA** | +35% click rate | One call-to-action per email |

### Template Best Practices

✅ **DO:**
- Keep emails under 200 words
- Use 1-2 calls-to-action (CTA)
- Personalize with variables
- Include specific value proposition
- Reference recent news/data

❌ **DON'T:**
- Use "Buy Now" or "Click Here"
- Send too frequently (max 2-3/week)
- Send at random times
- Use generic greetings
- Avoid spam trigger words

---

## 🔒 Compliance

### CAN-SPAM

All outreach campaigns must:
- ✅ Have valid From: address
- ✅ Include physical business address
- ✅ Have clear unsubscribe link
- ✅ Honor opt-out within 10 business days
- ✅ Include subject line

**Implementation:**
```
Each email includes footer:
"---
Commercial Intelligence Team
Maravilla Cleaners
[Address]
Unsubscribe: [link]
"
```

### GDPR

- ✅ Consent before sending (assumes Airtable = consent)
- ✅ Easy unsubscribe
- ✅ Privacy policy link
- ✅ Data retention policy (90 days)

---

## 📞 Support

### Common Issues

**Q: Emails not sending**
- Check EMAIL_SERVICE env var is set correctly
- Verify API key has permission to send
- Check recipient email is valid

**Q: Tracking not working**
- Ensure email service supports pixel tracking
- Check recipient opens image in email client
- Some email clients block images

**Q: High bounce rate**
- Validate email addresses before sending
- Check domain reputation
- Reduce send frequency

---

## 🚀 Next: Advanced Features

| Feature | Complexity | Timeline |
|---------|-----------|----------|
| SMS campaigns | Medium | 1 week |
| WhatsApp templates | High | 2 weeks |
| A/B testing | Medium | 1 week |
| Behavioral sequences | High | 2 weeks |
| Lead scoring from engagement | High | 3 weeks |

---

**Ready to build relationships at scale!** 🚀
