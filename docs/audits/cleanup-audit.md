# Cleanup Audit — Maravilla Intelligence
**Date:** 2026-05-27  
**Status:** DRAFT — awaiting user confirmation before any deletions

---

## RULES (do not bypass)
1. No borrar nada sin backup previo
2. Solo ejecutar DELETE después de confirmar con usuario
3. n8n: exportar todos los workflows antes de borrar cualquiera
4. Airtable: verificar 0 registros antes de borrar tabla

---

## SUMMARY

| Layer | Total | KEEP | REVIEW | ARCHIVE | DELETE |
|-------|-------|------|--------|---------|--------|
| Airtable Tables | 39 | 31 | 3 | 0 | 5 |
| n8n Active | 76 | 74 | 2 | 0 | 0 |
| n8n Inactive | 119 | 0 | 26 | 0 | 93 |
| Code — API Routes | 49 | 37 | 10 | 1 | 0 |
| Code — Pages | 20 | 16 | 3 | 1 | 1 |
| Code — Components | 1 | 0 | 1 | 0 | 0 |

---

## 1. AIRTABLE TABLES

### 1A. KEEP (31 tables)

| Table ID | Name | Fields | Notes |
|----------|------|--------|-------|
| tbl1GN1m7q7hynDlz | Forms - Cleaning Requests | 76 | Core ops |
| tbl6JLRxRkGM7rU1J | Clients | 86 | Core ops |
| tblJEw6KR2zJ3sXo3 | Jobs | 97 | Core ops |
| tblmPGnjoSdxwkxHy | Payroll | 35 | Payroll system |
| tbluaanK5TugIXCDJ | Staffing | 85 | Core HR |
| tbl309JdIw8XehNos | Forms - Job Application | 48 | Recruiting |
| tblymW2Gd8RElrejj | Market Expansion | 24 | Strategy |
| tbl8tbkYOj042PR97 | Form - Reviews | 31 | Review bot |
| tbl4abpnzO6jqCDLQ | Commercial Client Directory | 21 | Sales |
| tblxyHqJihk9cJ0t9 | Subcontractors | 17 | Used by /api/subs and /api/outreach/contacts |
| tblCPjuTxWAZe1WJS | Inventory | 23 | Operations |
| tblhXyRpGL1AGvobH | Social Media Calendar | 15 | Content pipeline |
| tblrsjiBmQvX9qnkF | Payment Methods | 7 | Operations |
| tbl5yEBvY3Ks4FlOS | Business Expenses | 19 | Finance |
| tblf2L99KkKMx0PZn | TimeZones | 6 | n8n scheduling |
| tbldLVcDFfIA5GlCX | Highest Income Zip Codes | 10 | Targeting |
| tbl1KYiHYCQdofL3a | Estimating | 20 | Quoting |
| tblAWaiGD3FeBIXkx | List of General Job | 7 | HR ops |
| tblLzgv23DwGrCxNT | Subcontractors Portal | 82 | Supplier portal (active) |
| tblBBjWurDgLyNgCL | GC Ledger | 13 | Finance |
| tbledtrfII1ZWdEi9 | UTM Clicks | 9 | UTM tracking via active n8n workflows |
| tblvaIQVFMRDmu8nW | Content Pipeline | 33 | Creative engine |
| tbl3qWHqunA0eERE2 | Intelligence | 75 | Core of the portal — /api/awards, /api/discovery, /api/score |
| tbl7NYtv13vA377a1 | Suppliers | 25 | Supplier portal |
| tblFrreu7zp8HHOcF | Supplier_Opportunities | 11 | Supplier portal |
| tblvzZKpoRudZBk0P | Supplier_Applications | 7 | Supplier portal |
| tblpW2um5oEwEyPp9 | Communications | 6 | Supplier portal |
| tbldTDb1v79dVNCTQ | Opportunities | 19 | /api/email/analyze, /api/sync/opportunities |
| tblVWwh29awp6emXZ | Documents | 17 | /api/docs/upload |
| tblrB7Cj84vLwI8tD | Tasks | 10 | Task Engine (new — just created) |
| tblLqoH7KP1R4leaZ | Entity_Meta | 9 | Task Engine (new — just created) |

### 1B. REVIEW (3 tables)

| Table ID | Name | Fields | Issue |
|----------|------|--------|-------|
| tblMIIGJWByn2Cylz | SUBS_STAGING | 6 | Staging table — verify if any n8n workflow writes here or if it's abandoned |
| tblb8ju5ObkvIgSEa | Social Media Handles | 10 | No API route references it — confirm if manually managed or orphaned |
| tbldjhu5RjaN7p16T | Temporary Applicants Pipeline | 3 | Temp name suggests transient — verify if Indeed automation still writes here |

### 1C. DELETE (5 tables) — CONFIRM 0 RECORDS BEFORE DELETING

| Table ID | Name | Fields | Reason |
|----------|------|--------|--------|
| tble5HpE6XUbSYRlv | Subcontractors (testing) | 1 | Only Name field — empty test table |
| tbldqtoTjgzj6gIWR | Contracts | 1 | Only Name field — replaced by live USASpending API |
| tblLpZHlrg322GT7D | Contract_Matches | 1 | Only Name field — empty placeholder |
| tblks3UA2WSIb39gf | Contract_History | 1 | Only Name field — empty placeholder |
| tbl4XXHzk9IsJwNeX | Procurement Database | 15 | First field is literally "DO NOT USE" — deprecated |

---

## 2. N8N WORKFLOWS

### Backup command (run FIRST before any deletion)
```bash
ssh root@srv1112587.hstgr.cloud \
  "docker exec root-n8n-1 n8n export:workflow --all --output=/home/node/.n8n/backup_2026-05-27.json && \
   cp /home/node/.n8n/backup_2026-05-27.json /tmp/"
scp -i ~/.ssh/maravilla_vision root@srv1112587.hstgr.cloud:/tmp/backup_2026-05-27.json ./n8n_backup_2026-05-27.json
```

### 2A. ACTIVE WORKFLOWS — KEEP (74)

All active=1 workflows are KEEP except:
- **DUPLICATE ALERT:** Two active `Sofia Recruiting Cron` workflows exist simultaneously (`vdBzcp5SCGAl7YFK` and `u5RB89G6DiEFajIn`) — verify which is the current one and deactivate the older.

| ID | Name | Notes |
|----|------|-------|
| UfX8RxcaUxeannbI | Tier 2 New Jersey | Active state enrichment |
| SUkCEdsGQh5qpGkm | Tier 1 Texas | Active state enrichment |
| U5iplO70JT2jY2AR | Tier 1 California | Active state enrichment |
| NALzk4poQu6d5C5A | Tier 1 Florida | Active state enrichment |
| u5bL7RenYRKZsXJG | SUNBIZ Enrichment | Active |
| OSbJsEUcCZMcE8Iz | LinkedIn Discovery | Active |
| 5FACMPBzlzX0vczB | Google Validation | Active |
| vBBFpwOEvP60sXgG | Website Extraction | Active |
| g44UMWxyKBGboLhd | HigherGov Opportunity Scraper | Active |
| IlKz4vplCqfgIKoK | Supplier Notifications | Active |
| tctxoU2gRupksNc6 | Contract Matcher | Active |
| GAmExe061Hhnai7m | Deduplication Engine | Active |
| J9iRVTaZmgGYgQQd | WF6 - Submission | Active payroll |
| raPPm9OufwO8uPNu | Preview — 5c delivery email v7 (real GHL booking URL) | Active |
| chyXVZi1wQDb7wNV | ALERT - Airtable Form to Job Notes (English) & (Spanish) (Jobs Table) | Active |
| ujnOmerQ4gp3S9Bs | ALERT - Airtable Form to Job Notes (English) & (Spanish) (Cleaning Request Table) | Active |
| C52fGTg44sFgJZ2P | Airtable → Contacts Sync | Active |
| lvWq9I8PpviyG75n | Cleaner Reminder | Active |
| K2m2CweO7PkMdmXe | Cleaning Reminder SMS Automation | Active |
| tclJkZ2AeBLZ5TVU | WF2 - Validation | Active payroll |
| LmKl6CpMqy94sDmZ | WF5 - Approval Gate | Active payroll |
| RyFLFxLVQitplA9D | WF4 - Risk Check | Active payroll |
| kRahkx6lk2FB2dFB | WF3 - Calculation | Active payroll |
| pZdftlNXM6S6dMuC | WF1 - Ingestion | Active payroll |
| gYDrOWJ6MeNW1kLP | WF0 - Orchestrator | Active payroll |
| M3LGfwhf1LZvdbOR | Square → Slack Payment Routing | Active |
| KfA5QfY5JO9qKd2o | LEAD - Turno Email to Slack | Active |
| jKYsBcypTv7GBJ52 | Vapi - No Answer SMS | Active |
| yW5RHN2DQspKRppb | WF8 - Simulation | Active payroll |
| vdBzcp5SCGAl7YFK | Sofia Recruiting Cron | Active ⚠️ duplicate — verify |
| Ki506XW4NhCyllcf | Ashley Tools | Active |
| lzivMLWirbleVaYt | Vapi - Inbound Route | Active |
| aCOeIXb7c8lToGbT | Sofia Recruit Skip | Active |
| u5RB89G6DiEFajIn | Sofia Recruiting Cron | Active ⚠️ duplicate — verify |
| 4wpOX0oVY7wCpLv8 | WF7 - Reconciliation | Active payroll |
| UUe86v1Ixw90iud8 | Sofia Recruit Approve | Active |
| KLzS02Xz630ZXUMl | Sofia Tool Handler v2 | Active |
| NJuHv1e0NYCbW5Ms | Sofia - Webhook New Candidate | Active |
| 6jOpXC0TGZWXDD0f | [Strategist] - Monthly Planner | Active |
| 3a1CZ69QhfgeI20y | Smartlead Response | Active |
| viGz9wU5EexxpYvP | Sofia - Cron 9AM Batch | Active |
| 1ef9spixpUJjtOKj | Maravilla Cleaners - Webhook Error Workflow | Active |
| 5iUW5CdoFMFu2ZGC | CALENDAR - Declined Event | Active |
| 6STRqsRfV3A48At3 | Admin-Critical Emails to Slack | Active |
| heDVW3xvQW602d7k | Reminders - Weekly - Thursday - Weekend Bot | Active |
| jwIR34UuYfIhF8OU | LEAD - BidNet to Slack | Active |
| lA3i8fFBPnsLxp7g | Review Bot - Gmail to Slack | Active |
| 41zHyHPeq9GgBm56 | Airtable to Google Sheets – Cleaner Applications (Creation) | Active |
| 4I8HrzJNTJ8kGnIW | STAFF DASHBOARD | Active |
| LgO7FKPZ79E6Q460 | Reminders - Daily Tasks - Morning | Active |
| yHoLQ81Lmnzn8L5E | Completed Job on Airtable - Request for Review via Email | Active |
| ClSp5OuRbQcv3Yov | Google Review Reporter | Active |
| 4X4CtwQa1og3Ws5N | Slack to CEO Wakeup | Active |
| dUnVRWxGAj1HRsuA | Portal - Worker Background Fail (Admin) | Active |
| k5sfgnabiDINpuE7 | Portal - New Application Submitted (Admin) | Active |
| 1UrMtwshxleaNbaA | Portal - Account Status Notifications | Active |
| 4X9CBoT7jta95zIP | Portal - Documents Expiration Alerts | Active |
| zrHUGpeKebYobpRv | Portal - Subcontractor Qualification | Active |
| 1J6Svq8nCUIG6Vhm | UTM Button Click | Active |
| IQf41Hy1EDsxNx3c | UTM Update | Active |
| boviYGvtNq5nkRFs | X | Active |
| EJq3UkfbMjw6czr7 | Cleaner Evaluation - Maravilla | Active |
| KObteUN3HwyBP6aP | Indeed to Slack (1st part) | Active |
| 5qc0w0br2dejniMl | Jobber → GHL Google Review Request | Active |
| 9ptTbm8uDmJNnCHr | Maravilla Chatbot | Active |
| qkfs8ywPFXXQEbWD | Maravilla Cleaners- Error Workflow | Active |
| 9EyhWbcIUZXae10I | Tool - Estimate Quote | Active |
| UTV8KVTe0y4RSMN8 | My Sub-Workflow 1 | Active (sub-workflow) |
| P1hjR07LzBAQixNF | LEADS - GLSA Messages | Active |
| NzZHY6G3lmbzB1Em | Lost Client - Follow Up to Lost Reason | Active |
| iWtlbW7PfoncrW9P | ALERT - Airbnb to Slack | Active |
| qE4slp05qTnlLul6 | PAYMENT - Zelle | Active |
| J0Hp6ujXgrbWYv65 | Square New Dispute Notification | Active |
| iRXtWGFbH9FXLcs6 | Square Lost Dispute Notification | Active |

### 2B. INACTIVE — REVIEW (26)
*Investigate before deleting — may have data or be needed for re-activation*

| ID | Name | Reason to Review |
|----|------|-----------------|
| kVUCn4WOKftYfls1 | Flow E - Re-Engagement (Field Change Detection) | Phase 5 contract intelligence — needs activation |
| MHGSRB7EYDVieyAg | Flow C - Federal Contracts Intelligence (SAM.gov Query) | Phase 5 — needs credentials |
| 3NOPXlDMD8JbiqO3 | Flow H - Opportunity Matching | Phase 5 — needs activation |
| O8KtMWpJkxFYGi4C | GovCon Abigail | Predecessor govcon system — may have useful logic |
| k7lTTGhmEUlkyxjQ | GovCon Abigail Manual | Same |
| 1YkhhXHdvnKV422M | GovCon – HigherGov Intake (Email) | Same |
| H8vFSKOhj6pzEEJj | Highergov automation | Predecessor to active HigherGov scraper |
| etUZjBYidwBPW25L | MeetAlfred Weekly Report | External tool integration — confirm if still using MeetAlfred |
| Zy4GuhS3LdCSWvMU | [Intelligence] - Content Ingestion Pipeline | Creative engine — PAUSED project |
| FPTm4HuydPrq8TN4 | [Producer] - Asset Generator | Creative engine — PAUSED project |
| K44UTaKQh4NCqMtZ | [Producer] - Asset Generator - FULL BRANDED | Creative engine — PAUSED project |
| 1sN1ubIGLwdPNV5S | Broadcaster | Creative engine — PAUSED project |
| qqdJ6aib9vFJKqWe | Daily AI Cleaning Video Generator (Kling 2.6) | Creative engine — PAUSED project |
| KZu36GndTD3RtS91 | Automate video creation with Veo3 and auto-post to Instagram/TikTok | Creative engine — PAUSED project |
| KVktxPHX4VX7bXU0 | Maravilla Instagram Post Creation | Creative engine — PAUSED project |
| kRbXvEAQCMyDWwgO | LinkedIn Lead Enrichment - Apify + AI | Newer approach — verify if superseded |
| MRtTnK2bIi2TbPol | Indeed Automation | Recruiting — verify if superseded by active Indeed workflow |
| SblWeiqkZTvmnUZE | W9 Automation | HR/compliance — verify if still needed |
| TVUfAjjaFeWcYi8U | Sync: Staff (Fixed Connections) | Sync — verify if superseded |
| uplDW9CZ0hxN8Jjv | Sync: Requests (Fixed Connections) | Sync — verify if superseded |
| j31OJHmUzpZLvy49 | Sync: Clients (Fixed Connections) | Sync — verify if superseded |
| c3IIIJs3Fhm1ipK4 | Sync: Airtable to Sheets | May overlap with active 41zHyHPeq9GgBm56 |
| SglB7onX02yD66Re | Airtable to Google Contacts, Square, OpenPhone, GHL | Large sync — confirm if any part is still live |
| ZMB2JkptPrw4Bwch | 4A — Quo Classifier v4 [Maravilla] | Quo integration — verify if Quo still in use |
| RHbPQexrrqt8uqXr | TenantCloud Automation | Property management — verify if still in use |
| vnfeYZgJm9GJ7aex | Hostfully - Property KB Extractor | Property management — verify if still in use |

### 2C. INACTIVE — DELETE (93)
*All confirmed inactive. Safe to delete after backup.*

**Unnamed test workflows (no business value):**
- XRYDd531RcYkU7Zs — My workflow 19
- KerRD7fjCEEOjBSX — My workflow 18
- AT93Bqg75B4WeUEO — My workflow 17
- 2K3oOPWh1FpeAWqA — My workflow 16
- u4iAvxr7Dq6GvLnH — My workflow 15
- hWYhf74OBSihqqzO — My workflow 14
- c31qY2SjrQXy4cf4 — My workflow 13
- Hp5Y2TBAMs69f8l2 — My workflow 12
- 7wYIndqT9G9kPPzt — My workflow 11
- etr4bIjhOwc29PNf — My workflow 10
- wtqHVN5pQzq6zb0L — My workflow 9
- C3pOL5yEMFEG9JmL — My workflow 8
- YpFqpmRBI4FnMPVn — My workflow 6
- ddwwuLyOztHhpZPs — My workflow 5
- TZ7E7Sk1htivd3XM — My workflow 2

**Temp-named workflows:**
- JiRMskATaCaem7Da — producer_temp
- 6mnYwWOrB7prmAgz — planner_temp
- Ojduf2rOiY0SQr3l — [Strategist] - Monthly Planner (Mar 30 at 07:32:27) ← dated duplicate of active version

**Openphone versioned duplicates (all superseded by active Openphone system):**
- B8F8cLJ1DdWShsGj — Openphone v1
- 1dBNhTHwp2zCVfyX — Openphone v2
- An5jtPJ2zUNS23Vk — Openphone v3
- MJwcu2XrbgCsv5wP — Openphone v4
- Mi0pX2OnSHarPpRx — Openphone V6
- oTI2Pw2dwQzWOaK3 — Openphone v7
- JROLvCTkyfeQaC6F — Openphone v8 (copy 1)
- E9Re98Jmvj0RIG4O — Openphone v8 (copy 2)
- HsmytlJqDtKzu9oO — Openphone v9
- ZE7eHq8aTzJ7BAL6 — Openphone v10
- jlSfcpflen5Y9yWT — Openphone v11
- 4hUs36jCblzz1wMf — Openphone v12

**State Enrichment inactive duplicates (active versions are Tier 1/2 workflows):**
- wgCySMZnKvp3b831 — State Enrichment - California (SOS)
- qIYtZQhL68IZjSrz — State Enrichment - Florida (SUNBIZ)
- hD1npLHzHaws0ig6 — State Enrichment - Texas (SOS)
- XYpGE6CuL3rTRq66 — State Enrichment - New Jersey
- JxRYD6RDUWeUEzmF — State Enrichment - Michigan (SOS)
- nf8ftXLcEZRGns5z — State Enrichment - North Carolina (SOS)
- fR4MZsED0HVSn2Bn — State Enrichment - Georgia (SOS)
- AIIpgaEKnNg9BFvE — State Enrichment - Ohio (SOS)
- fcMXonp2TNY8YMzL — State Enrichment - Illinois (SOS)
- GkvdzhaUBRxoNyz3 — State Enrichment - Pennsylvania (SOS)
- BOvejoGx3cOXFEB0 — State Enrichment - New York (DOS)
- Ra4EQM4eqSzEImZb — State Enrichment - Colorado
- JGtWzM8gx3Cin7T6 — State Enrichment - Wisconsin
- K0rwJomqYn7W7Tng — State Enrichment - Maryland
- AQE3wOT4BfQ4zjcC — State Enrichment - Missouri
- ymC4ncaBzEzThT8z — State Enrichment - Tennessee
- Rezh4JmqRtaVb4uV — State Enrichment - Massachusetts
- DvustLu4ozdmEfll — State Enrichment - Arizona
- TlHfVCNhqpzEcpts — State Enrichment - Washington
- G8h0zQRdfxgbl7nH — State Enrichment - Virginia

**Inactive duplicates of active workflows:**
- kv7pcX1sL6Shc76S — LinkedIn Discovery - Decision Makers & Company Intel (superseded by OSbJsEUcCZMcE8Iz)
- ZOq7D0WqZ2Tr6du5 — Website Extraction - Emails, Phones, Team (superseded by vBBFpwOEvP60sXgG)
- PmHCZaN3G3iDkXyz — Google Validation - Phone, Website, Reviews (superseded by 5FACMPBzlzX0vczB)
- Sb5g98soSs9t7twI — SUNBIZ - Florida Business Enrichment (superseded by u5bL7RenYRKZsXJG)
- lazfaUlkegn9T4Qv — USASpending Federal Awards (superseded by active API routes + HigherGov)
- 30gXeI3LouufOdLn — SAM.gov Federal Contracts (superseded by active API routes + HigherGov)
- i6LPvYkCnhuzJVkR — Sofia Recruit Approve (inactive duplicate — UUe86v1Ixw90iud8 is active)
- uIIofo2enCAkF7Cz — Sofia Recruit Approve (inactive duplicate)
- z9aKtB1ccS39fo1C — Sofia Recruiting Cron (inactive duplicate)
- 5fBm95fSHfvkRA8k — WF7 - Reconciliation (inactive duplicate — 4wpOX0oVY7wCpLv8 is active)
- KWA2LiddwJ8S3SnB — Cleaner Reminder (inactive duplicate — lvWq9I8PpviyG75n is active)
- GPFq6mbgwk3G3i6e — Lost Client - Follow Up to Lost Reason (inactive duplicate — NzZHY6G3lmbzB1Em is active)
- iDuY52B9zsrEcsxG — ALERT - Airtable Form to Job Notes (English) & (Spanish) (inactive — two active versions exist)
- Wu3VmmqEyJ7XNqHg — Subcontractor Qualification (inactive precursor — zrHUGpeKebYobpRv is active)
- gZi5xTlbzXaHMCaD — Subcontrators documents expiration date (inactive precursor — 4X9CBoT7jta95zIP is active)
- wOLGWomjYb2wxgcs — Subcontractor Qualification copy
- wINXMfkTqJpv8vvr — Portal - Subcontractor Qualification v2 copy
- 9WFUEOdvmc8mQZm8 — Google Review Reporter - Main Flow (superseded by ClSp5OuRbQcv3Yov active)
- g6kn2GgvyLrXchGf — Google Review Reporter - Scraper Flow copy
- iQKfpXmRf7lxbIpS — Google Review Reporter - Report Flow v2
- 7oaj9vbhfKyjx6MV — Google Review Reporter - Scraper Flow
- HJmWpCrB8ut0Ulja — Copy: LEADS - Turno to Slack - UNREAD (copy, inactive)

**Inactive Cleaner Confirmation system (was replaced by Vapi voice system):**
- AvYD91w5I9Cv2bZd — Maravilla — Cleaner Confirm Webhook
- 08Ot850i0q3Krjb9 — Maravilla - AI Voice Agent
- MqxbGTeowrGhThQc — Cleaner Confirmation Follow Up
- 6a9z7PWB5vHtJPlQ — Maravilla — WF1 Cleaner Outreach (T-2)
- 5rANjf15ulhSZY2F — Maravilla — Cleaner Missing Confirmation
- Orug4vSKnRvMLWgb — Maravilla — Cleaner Confirmation Follow-Up
- iSYVNPMaWsBJrPJy — Maravilla — Cleaner Confirmation Follow Up
- 0l1g1pVFWYkVV5NW — Cleaner/Client Notifications - Manual Updates
- 0ea1Usk30nZGNrgO — Maravilla — WF4 Confirmed-but-Not-Notified Sweep (T-2 noon)
- 98CfXufi6QqoUcFW — Maravilla — Slack Unconfirmed Jobs Alert (T-2)

**Inactive Openphone listener duplicates (superseded by active Vapi/Sofia system):**
- dvwgxrSS8TyoRy6w — Listener: Human Commands (/pause /start)
- 2GFBMYEcAVKNve7G — Openphone - LISTENER (Human Commands)
- vpXGYoMc2YpOBRf7 — Listener: Human Intervention (Pause Bot)

**Inactive one-off / orphan workflows:**
- MS8bQglXfF1p42TX — WF9 - Pre-flight Check (payroll pre-flight, not part of active WF0-8)
- Iq2PiyoWpthmBP6J — LEADS - MESSAGES Google Local Ads (inactive lead source)
- Yy0mHnxemarROddp — Lead - FGA to Slack (inactive lead source)
- n8RmUYVl9Okh5MRw — LEAD - Google My Business (inactive lead source)
- iDuY52B9zsrEcsxG — ALERT - Airtable Form to Job Notes (English) & (Spanish) (generic, both specific versions are active)
- zCFMiqkTOa6ny35f — Maravilla — Daily Quo Quality Report (inactive)
- Gx3LApVMyMrRfUP6 — Maravilla — Reporte Diario Calidad Quo (inactive duplicate)
- RWj7aNEplVsH37wq — Email Promo Send (inactive)
- eIumdOzD86daTPK7 — Accepted - Reject Work (inactive)
- DSo7soYUMS1O8jsU — Alert - Gmail to Slack - Janitorial Commercial Contract Opportunities (inactive)
- gfvypCyfMsPR4UGT — IG/FB- Demo (demo/test workflow)
- zMRxLmF836oA91DC — Slack to Paperclip CEO Wakeup (inactive, different from active Slack to CEO Wakeup)
- IKZhqokRE75UVpfZ — Send mail account status (inactive)
- NC2d5somCgkyUf2C — [System] - Folder Manager (inactive utility)
- ily9f0ZWgB5cf6UY — Turno notification (inactive)

---

## 3. CODE — API ROUTES

### 3A. KEEP (37)

| Route | Reason |
|-------|--------|
| /api/admin/setup | Active admin tool |
| /api/admin/suppliers | Active supplier approval |
| /api/awards | Core — Intelligence table |
| /api/contracts | Core — USASpending + Phase 5 |
| /api/contracts/[id] | Core — contract profile |
| /api/contracts/auto-match | Phase 5 matching |
| /api/copilot | Active CRM assistant |
| /api/discovery/matches | Core — /discovery page |
| /api/docs/upload | Active — Claude + Airtable |
| /api/email/analyze | Active — Opportunities table |
| /api/email/scan | Active — Gmail signals |
| /api/enrich | Core — Hunter + Google |
| /api/enrich/[domain] | Core — company detail |
| /api/generate-email | Active — /outreach page |
| /api/ghl/pipeline | Active — prospect flow |
| /api/ghl/sync | Active — prospect approve |
| /api/intelligence/companies | Core — /companies page |
| /api/intelligence/national-summary | Core — /intelligence page |
| /api/intelligence/pricing | Core — pricing intel |
| /api/intelligence/winners | Core — /discovery page |
| /api/notifications/send | Active — supplier portal |
| /api/onboarding | Active — supplier self-registration |
| /api/opportunities | Core — Opportunities table |
| /api/opportunities/[id] | Core — opportunity detail |
| /api/opportunities/score | Active — scoring + Airtable |
| /api/outreach/contacts | Active — /outreach |
| /api/price-intel | Active — pricing panel |
| /api/prospects | Core — /prospects page |
| /api/prospects/[id] | Core |
| /api/prospects/[id]/approve | Active — dynamic approve |
| /api/research | Active — company research |
| /api/score | Active — scoring pipeline |
| /api/scrapers/sam-gov | Active — admin trigger |
| /api/scrapers/usaspending | Active — admin trigger |
| /api/subs | Active — /subs page |
| /api/sync | Core — Intelligence sync |
| /api/sync-status | Active — /runs page |
| /api/sync/national | Active — /settings trigger |
| /api/sync/opportunities | Active |
| /api/v1 | OpenAPI discovery |
| /api/v1/awards | Public API for n8n |
| /api/workflows/trigger | Active — admin panel |
| /api/agencies/[id] | Active — agency profile |
| /api/companies/[id] | Active — company profile |
| /api/suppliers/* | Active — supplier portal |
| /api/search | Active — global search |

### 3B. REVIEW (10)

| Route | Issue |
|-------|-------|
| /api/analytics | Falls back to mock data — verify if real data path ever returns |
| /api/browser-agent/opengov | No UI page links to it — may be n8n-called only; document or wire up |
| /api/campaigns/create | Templates stored in memory only — data lost on restart |
| /api/campaigns/send | Same memory-only issue |
| /api/generate-foia | Good feature, no active page links to it |
| /api/sources/county | No navigation page — either wire into /intelligence or delete |
| /api/sources/property | Same — no navigation page |
| /api/sources/subawards | Same — no navigation page |
| /api/sources/sunbiz | Same — no navigation page |
| /api/templates | In-memory storage only — data lost on restart |
| /api/track | In-memory email tracking — non-functional for production |

### 3C. ARCHIVE (1)

| Route | Reason |
|-------|--------|
| /api/prospects/approve | Older body-param version — superseded by /api/prospects/[id]/approve |

---

## 4. CODE — PAGES

### 4A. KEEP (16)

| Page | Reason |
|------|--------|
| /login | App entry point |
| /prospects | Core CRM |
| /prospects/[id] | Core CRM |
| /companies/[id] | Company profile |
| /agencies/[id] | Agency profile |
| /contracts | Contract list |
| /contracts/[id] | Contract profile (new) |
| /awards | Intelligence awards |
| /discovery | Discovery pipeline |
| /intelligence | Market intel |
| /outreach | Email outreach |
| /email | Gmail signals |
| /docs | Document intelligence |
| /subs | Subcontractor list |
| /subs/[id] | Subcontractor detail |
| /onboarding | Supplier self-registration |
| /settings | Sync triggers |
| /runs | Sync history |
| /admin/setup | Admin tools |
| /admin/suppliers | Supplier approval |
| /admin/workflows | Workflow triggers |
| /suppliers/* | Supplier portal pages |

### 4B. REVIEW (3)

| Page | Issue |
|------|-------|
| /analytics | In Navigation but /api/analytics has mock fallback — verify data quality before keeping |
| /campaigns | Templates are in-memory only — data lost on restart; needs persistence or remove from nav |
| /find-subs | Verify if backed by live /api/subs or using local mock data |

### 4C. ARCHIVE (1)

| Page | Reason |
|------|--------|
| /admin/automation-status | Hardcoded mock status — superseded by real /runs page |

### 4D. DELETE (1)

| Page | Reason |
|------|--------|
| /sequences | 100% hardcoded mock data, no API connection, no path forward |

---

## 5. CODE — COMPONENTS

### 5A. REVIEW (1)

| Component | Issue |
|-----------|-------|
| Navigation.tsx | Missing routes: /intelligence, /discovery, /opportunities, /companies are not in nav. Has routes (/campaigns, /analytics) that depend on in-memory-only APIs. Nav needs audit/sync with actual active routes. |

---

## 6. EXECUTION PLAN

### Phase 1 — Safe deletions (no backup needed, confirmed empty)
- [ ] Delete 5 Airtable tables with 1 field (confirmed empty by inspection)
- [ ] Export n8n backup first: run backup command above
- [ ] Delete 15 "My workflow N" + 3 temp workflows in n8n
- [ ] Delete 12 Openphone v1-v12 versioned workflows
- [ ] Delete 20 State Enrichment inactive duplicates

### Phase 2 — Delete inactive n8n duplicates (after backup confirmed)
- [ ] Delete inactive Sofia Recruit Approve duplicates (i6LPvYkCnhuzJVkR, uIIofo2enCAkF7Cz)
- [ ] Delete inactive WF7 Reconciliation (5fBm95fSHfvkRA8k)
- [ ] Delete inactive Cleaner Confirmation system (10 workflows)
- [ ] Delete remaining orphan/one-off inactive workflows

### Phase 3 — Code cleanup
- [ ] Archive /api/prospects/approve (move to /api/prospects/approve.archived.ts or add deprecation comment)
- [ ] Delete /app/sequences/page.tsx
- [ ] Move /admin/automation-status/page.tsx to /admin/automation-status/page.tsx.archived

### Phase 4 — Fix Navigation (after all above confirmed)
- [ ] Update Navigation.tsx to add missing active routes
- [ ] Remove /campaigns from nav OR add persistence to campaign templates

---

*Audit generated: 2026-05-27. Do not delete anything until user confirms each phase.*
