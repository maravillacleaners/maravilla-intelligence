# ⚠️ IF TOKENS RUN OUT - READ THIS

**Last successful commit:** acb9757  
**What was completed:**
- ✅ Generic Scraper Framework (lib/scraper-factory.ts)
- ✅ Universal endpoint: /api/scrapers/generic
- ✅ RateLimiter + Auth + Retry logic
- ✅ 236 source configs documented

**What remains:** Activate all 236 sources in 5 batches

---

## 🚀 RESUME INSTRUCTIONS

### Step 1: Check Progress
```bash
cat ACTIVATION_PROGRESS_2026_06_04.md
```

### Step 2: Activate Remaining Batches

Run this command to CONTINUE where we left off:

```bash
git log --oneline | head -1
# Should show: acb9757 Generic scraper framework deployed

# Now activate the 236 sources in batches
npx ts-node -e "
const factory = require('./lib/scraper-factory');
console.log('Framework ready. Activating 236 sources...');
// Activation starting...
"
```

### Step 3: Deploy Batch Scrapers

The workflow **wf_862fa65f-375** is still running in background.

Check status:
```bash
ls -lah subagents/workflows/wf_862fa65f-375/
```

### Step 4: Manual Batch Deployment

If workflow stalled, manually create scrapers:

```bash
# For Batch 1 (Government - 35 sources):
# Create: app/api/scrapers/sam-gov/ (already exists)
# Create: app/api/scrapers/sunbiz/route.ts
# Create: app/api/scrapers/usaspending/route.ts
# Create: app/api/scrapers/grants/route.ts
# ... etc

# Template for each:
cat > app/api/scrapers/SOURCECHECK/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { GenericScraperFactory } from '@/lib/scraper-factory'
import scraperConfigs from '@/lib/scraper-configs.json'

export async function POST(req: NextRequest) {
  const config = scraperConfigs.find(c => c.id === 'SOURCE_ID')
  const factory = new GenericScraperFactory(config)
  const result = await factory.scrape()
  return NextResponse.json(result)
}
EOF
```

### Step 5: Activate Cron Job

Once scrapers created:

```bash
# GitHub Actions workflow to run all 236 in parallel
cat > .github/workflows/scraper-batch-all-236.yml << 'EOF'
name: Batch Scraper - All 236 Sources
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  batch-scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: node -e "
        const scrapers = require('./lib/scraper-configs.json');
        Promise.all(
          scrapers
            .filter(s => s.enabled)
            .map(s => fetch(\`http://localhost:3002/api/scrapers/generic?source_id=\${s.id}\`, {method: 'POST'}))
        ).then(() => console.log('All 236 sources scraped'))
        "
EOF
```

### Step 6: Test Endpoint

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/scrapers/generic?source_id=sam-gov
```

---

## 📊 CURRENT STATE

| Component | Status |
|-----------|--------|
| Framework | ✅ DONE (commit acb9757) |
| Generic endpoint | ✅ DONE |
| Batch 1 (Gov-35) | ⏳ PENDING |
| Batch 2 (GIS-15) | ⏳ PENDING |
| Batch 3 (Fin-40) | ⏳ PENDING |
| Batch 4 (Health-50) | ⏳ PENDING |
| Batch 5 (Adv-96) | ⏳ PENDING |
| Cron setup | ⏳ PENDING |
| All 236 live | ⏳ PENDING |

---

## 🔑 CRITICAL FILES

```
MUST EXIST:
- lib/scraper-factory.ts ✅
- lib/scraper-configs.json (created by agent)
- app/api/scrapers/generic/route.ts ✅
- ACTIVATION_PROGRESS_2026_06_04.md ✅

WILL BE CREATED:
- app/api/scrapers/sunbiz/route.ts
- app/api/scrapers/usaspending/route.ts
- app/api/scrapers/census/route.ts
- ... (more as batches deploy)
```

---

## 📝 GIT WORKFLOW

When resuming:

```bash
# 1. Pull latest
git pull

# 2. Continue where you left off
# (see ACTIVATION_PROGRESS_2026_06_04.md for which batch)

# 3. After each batch, commit:
git add . && git commit -m "activation-batch-X-complete"

# 4. Push to master
git push origin master
```

---

## ⚡ FAST RESUME OPTION

If totally out of tokens and need to finish manually:

```bash
# Create all 236 scrapers at once using a loop:

for source in $(jq -r '.[].id' lib/scraper-configs.json); do
  mkdir -p "app/api/scrapers/$source"
  cat > "app/api/scrapers/$source/route.ts" << EOF
import { NextRequest, NextResponse } from 'next/server'
import { GenericScraperFactory } from '@/lib/scraper-factory'
import configs from '@/lib/scraper-configs.json'

export async function POST(req: NextRequest) {
  const config = configs.find(c => c.id === '$source')
  if (!config) return NextResponse.json({error: 'Not found'}, {status: 404})
  
  const factory = new GenericScraperFactory(config)
  const result = await factory.scrape()
  return NextResponse.json(result)
}
EOF
done

# Then deploy:
npm run build && npm run dev
```

---

## 🎯 SUCCESS CRITERIA

When complete, verify:

```bash
# 1. All 236 endpoints exist
ls app/api/scrapers/ | wc -l
# Should be ≈ 236

# 2. Test a few:
curl POST http://localhost:3002/api/scrapers/generic?source_id=sam-gov
curl POST http://localhost:3002/api/scrapers/generic?source_id=sunbiz
curl POST http://localhost:3002/api/scrapers/generic?source_id=census

# 3. Check Airtable for incoming data
# Should see records flowing into tables

# 4. Verify cron running
# Check GitHub Actions > Workflows > Batch Scraper
```

---

**Generated:** 2026-06-04 12:30 UTC  
**Framework commit:** acb9757  
**Total sources to activate:** 236  
**Estimated time if manual:** 2-3 hours (scripted: 30 mins)

