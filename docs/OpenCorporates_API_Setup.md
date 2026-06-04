# OpenCorporates API Integration

## Status: PENDING (Token Required)

### API Details
- **Service:** OpenCorporates — Global corporate registry data
- **Base URL:** https://api.opencorporates.com/v0.4
- **Authentication:** API Token (required for all requests)
- **Rate Limit:** Varies by plan (50/min public, higher with token)
- **Response Format:** JSON
- **Documentation:** https://api.opencorporates.com/documentation

### Key Endpoints
| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `/companies` | Global company search | Yes |
| `/companies/{jurisdiction}/{company_number}` | Company details | No (free tier) |
| `/officers` | Officer search | Yes |
| `/relationships` | Corporate relationships | Yes |
| `/corporate_actions` | M&A, bankruptcies, etc. | Yes |

### Test Results
```
Endpoint Test: https://api.opencorporates.com/v0.4/companies?q=Apple
Status: 401 Unauthorized
Error: "Invalid Api Token. Please check your OpenCorporates account"
```

### Next Steps to Activate
1. **Get API Token:**
   - Visit https://opencorporates.com/users/sign_up
   - Register or log in
   - Generate API token from account settings
   - Token format: 32-character alphanumeric string

2. **Test Token:**
   ```bash
   curl -s "https://api.opencorporates.com/v0.4/companies?api_token=YOUR_TOKEN&q=Apple"
   ```

3. **Store Token:**
   - Add to `.env` file: `OPENCORPORATES_API_TOKEN=YOUR_TOKEN`
   - Or use environment variable: `OPENCORPORATES_TOKEN`

4. **Implement in Code:**
   ```python
   import requests
   
   api_token = os.getenv('OPENCORPORATES_API_TOKEN')
   headers = {'Authorization': f'Token token={api_token}'}
   
   response = requests.get(
       'https://api.opencorporates.com/v0.4/companies',
       params={'q': 'company_name', 'jurisdiction': 'us_fl'},
       headers=headers
   )
   ```

### Use Cases for Maravilla Intelligence
1. **Company Verification** — Verify client company exists & is registered
2. **Officer Lookup** — Find company executives for enrichment
3. **Corporate Actions** — Track mergers, bankruptcies affecting clients
4. **Jurisdiction Compliance** — Validate business registration by state
5. **Relationship Mapping** — Discover parent companies, subsidiaries

### Pricing
- **Free Plan:** Up to 50 API calls/month
- **Paid Plans:** Start ~$50/month for higher limits
- **Enterprise:** Custom pricing for 1M+ calls/month

### Integration Points
- **Phase:** Post-enrichment (after Hunter.io, Census, SAM)
- **Frequency:** On-demand for new entities, batch monthly audit
- **Priority:** Medium (nice-to-have for GovCon validation)

---
**Status:** PENDING TOKEN
**Created:** 2026-06-04
**Last Updated:** 2026-06-04
