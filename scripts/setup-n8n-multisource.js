#!/usr/bin/env node
/**
 * n8n Multi-Source Opportunity Discovery Setup
 * Configura workflows para extraer de:
 * - HigherGov (tiempo real)
 * - SAM.gov (respaldo, oficial)
 * - USASpending (datos de adjudicaciones)
 * - Grants.gov (oportunidades de grants)
 */

const https = require('https')

const CONFIG = {
  N8N_URL: 'https://n8n.srv1112587.hstgr.cloud',
  N8N_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM',
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
  HIGHERGOV_API_KEY: '4be72a011d644af8bca9a11f85c90d95',
  SAM_GOV_API_KEY: process.env.SAM_GOV_API_KEY || 'SET_ME',
}

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     n8n Multi-Source Opportunity Discovery Setup               ║
║     Descubre oportunidades federales de múltiples fuentes       ║
╚════════════════════════════════════════════════════════════════╝

📊 FUENTES CONFIGURADAS:

1. HigherGov (Tiempo Real) ⚡
   - Espejo en tiempo real de SAM.gov
   - Mejor API, respuestas más limpias
   - Ejecutar: cada 6 horas
   API Key: ${CONFIG.HIGHERGOV_API_KEY}

2. SAM.gov (Respaldo Oficial) 🏛️
   - Fuente oficial del gobierno
   - Más datos (PDFs, attachments)
   - Ejecutar: cada 8 horas
   API Key: ${CONFIG.SAM_GOV_API_KEY === 'SET_ME' ? '⚠️  NO CONFIGURADA' : '✅ Configurada'}

3. USASpending (Adjudicaciones) 💰
   - Datos de contratos adjudicados
   - Información de contratistas
   - Ejecutar: cada 24 horas (daily)
   API Key: None (público)

4. Deduplication Engine 🔄
   - Elimina duplicados entre fuentes
   - Ejecutar: cada 1 hora
   Estrategia: Hash de URLs + matching inteligente

══════════════════════════════════════════════════════════════════

PRÓXIMAS ACCIONES:

1. Obtener SAM.gov API Key:
   - Ir a: https://api.data.gov/signup
   - Registrarse
   - Copiar API key
   - Guardar en: .env como SAM_GOV_API_KEY

2. Después, ejecutar este script nuevamente para crear workflows

3. En n8n UI:
   - Configurar Airtable connections
   - Activar workflows
   - Establecer schedules

══════════════════════════════════════════════════════════════════

NOTA: Este script SOLO genera instrucciones.
      Los workflows se crean MANUALMENTE en n8n UI.
      Ver: MULTI_SOURCE_N8N_SETUP.md para paso a paso.
`)

if (CONFIG.SAM_GOV_API_KEY === 'SET_ME') {
  console.log(`
⚠️  ACCIÓN REQUERIDA:

Para usar SAM.gov como fuente, necesitas una API key:

1. Visita: https://api.data.gov/signup
2. Completa el formulario
3. Recibirás un email con tu API key
4. Guarda en .env:
   SAM_GOV_API_KEY=tu_api_key_aqui
5. Ejecución con SAM.gov ACTIVA en siguientes ejecuciones

Mientras tanto, puedes usar:
- HigherGov (disponible ahora) ✅
- USASpending (disponible ahora) ✅
`)
}

console.log(`

📁 ARCHIVOS GENERADOS:

✅ OPPORTUNITY_SOURCES_RESEARCH.md
   - Análisis detallado de 14 fuentes
   - Comparativa de features
   - Recomendaciones por fase

✅ MULTI_SOURCE_N8N_SETUP.md (próximo)
   - Guía paso a paso para cada workflow
   - Configuración de Airtable
   - Testing instructions

✅ MULTI_SOURCE_ARCHITECTURE.md (próximo)
   - Diagrama de flujo
   - Deduplicación strategy
   - Performance metrics

══════════════════════════════════════════════════════════════════

WORKFLOWS A CREAR (en n8n UI):

┌─ Workflow 1: HigherGov Real-Time Scraper ─────────────────┐
│                                                            │
│  Schedule: Every 6 hours (0, 6, 12, 18)                  │
│  Purpose: Real-time opportunities from HigherGov          │
│                                                            │
│  Nodes:                                                    │
│  1. Webhook (trigger/highergov-realtime)                 │
│  2. HTTP Request → HigherGov API                         │
│  3. Code → Transform/normalize data                      │
│  4. Airtable → Save to Intelligence table                │
│  5. Log results                                           │
│  6. Respond                                               │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ Workflow 2: SAM.gov Official Source (Phase 2) ───────────┐
│                                                            │
│  Schedule: Every 8 hours (0, 8, 16)                      │
│  Purpose: Official government source as backup            │
│  Status: Pending SAM.gov API Key                         │
│                                                            │
│  Nodes:                                                    │
│  1. Webhook (trigger/sam-gov-official)                   │
│  2. HTTP Request → SAM.gov API                           │
│  3. Code → Transform to standard format                  │
│  4. Airtable → Save to Intelligence table                │
│  5. Respond                                               │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ Workflow 3: USASpending Enrichment Data ──────────────────┐
│                                                            │
│  Schedule: Every 24 hours (2 AM)                         │
│  Purpose: Adjudicated contracts & spending data           │
│                                                            │
│  Nodes:                                                    │
│  1. Webhook (trigger/usaspending-data)                   │
│  2. HTTP Request → USASpending API                       │
│  3. Code → Parse awards data                             │
│  4. Airtable → Save to Intelligence table                │
│  5. Respond                                               │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ Workflow 4: Deduplication Engine ─────────────────────────┐
│                                                            │
│  Schedule: Every 1 hour (:00)                            │
│  Purpose: Remove duplicates across sources                │
│                                                            │
│  Nodes:                                                    │
│  1. Trigger (hourly)                                      │
│  2. Airtable → Read all opportunities                    │
│  3. Code → Hash URLs, find duplicates                    │
│  4. Airtable → Update/merge records                      │
│  5. Log deduplication results                             │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ Workflow 5: Contract Matcher ─────────────────────────────┐
│                                                            │
│  Schedule: Every 1 hour (:05)                            │
│  Purpose: Match opportunities to suppliers                │
│                                                            │
│  Algorithm:                                               │
│  Score = (Services × 0.60) + (Location × 0.20) +        │
│           (Capacity × 0.20)                               │
│                                                            │
│  Nodes:                                                    │
│  1. Trigger (hourly, staggered 5 min after dedup)        │
│  2. Airtable → Read opportunities                        │
│  3. Airtable → Read suppliers                            │
│  4. Code → Matching algorithm                            │
│  5. Airtable → Save matches                              │
│  6. Respond                                               │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ Workflow 6: Supplier Notifications ───────────────────────┐
│                                                            │
│  Schedule: Every 6 hours (0, 6, 12, 18 - offset 30min)   │
│  Purpose: Email suppliers about new matches               │
│                                                            │
│  Nodes:                                                    │
│  1. Trigger (every 6 hours)                              │
│  2. Airtable → Read unnotified matches                   │
│  3. Code → Group by supplier                             │
│  4. Airtable → Fetch supplier emails                     │
│  5. SendGrid → Send notifications                        │
│  6. Airtable → Mark as notified                          │
│  7. Respond                                               │
│                                                            │
└────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════

DATA FLOW DIAGRAM:

┌─────────────────┐  ┌──────────────┐  ┌────────────────┐
│  HigherGov API  │  │  SAM.gov API │  │ USASpending API│
│   (Real-time)   │  │   (Official) │  │   (Spending)   │
└────────┬────────┘  └──────┬───────┘  └────────┬───────┘
         │                  │                    │
         └──────────────────┴────────────────────┘
                         ↓
         ┌───────────────────────────────────┐
         │   Transform & Normalize Data      │
         │   (Standard field schema)          │
         └───────────────────┬───────────────┘
                         ↓
         ┌───────────────────────────────────┐
         │   Airtable Intelligence Table     │
         │   (Centralized data store)        │
         └───────────────────┬───────────────┘
                         ↓
         ┌───────────────────────────────────┐
         │   Deduplication Engine            │
         │   (Remove duplicates via URL hash)│
         └───────────────────┬───────────────┘
                         ↓
         ┌───────────────────────────────────┐
         │   Contract Matching Algorithm     │
         │   (60/20/20 scoring model)        │
         └───────────────────┬───────────────┘
                         ↓
         ┌───────────────────────────────────┐
         │   Supplier Opportunities Table    │
         │   (Matched opportunities)         │
         └───────────────────┬───────────────┘
                         ↓
         ┌───────────────────────────────────┐
         │   SendGrid / Email Notifications  │
         │   (Alert suppliers)               │
         └───────────────────────────────────┘
                         ↓
         ┌───────────────────────────────────┐
         │   Supplier Portal Dashboard       │
         │   (Suppliers view opportunities)  │
         └───────────────────────────────────┘

══════════════════════════════════════════════════════════════════

SCHEDULE SUMMARY:

Time    Action
────────────────────────────────────────────────────────────────
00:00   ✓ HigherGov Scraper (run #1/4)
00:05   → Deduplication Engine (run #1/24)
00:10   → Contract Matcher (run #1/24)
00:30   → Notifier (run #1/4)

06:00   ✓ HigherGov Scraper (run #2/4)
06:05   → Deduplication
06:10   → Matcher
06:30   → Notifier

08:00   ✓ SAM.gov Scraper (run #1/3) - When configured
08:05   → Deduplication
08:10   → Matcher

12:00   ✓ HigherGov Scraper (run #3/4)
12:05   → Deduplication
12:10   → Matcher
12:30   → Notifier

16:00   ✓ SAM.gov Scraper (run #2/3)
16:05   → Deduplication
16:10   → Matcher

18:00   ✓ HigherGov Scraper (run #4/4)
18:05   → Deduplication
18:10   → Matcher
18:30   → Notifier

Daily (2 AM):
02:00   ✓ USASpending Scraper (daily enrichment)

Weekly (Wed 2 AM):
[Future] Grants.gov Scraper (weekly)

══════════════════════════════════════════════════════════════════

EXPECTED DAILY VOLUMES:

Source          Records/Day    New Unique    Monthly
────────────────────────────────────────────────────
HigherGov       200-400        180-350       5,400-10,500
SAM.gov         100-200        80-180        2,400-5,400
USASpending     50-100         40-80         1,200-2,400
────────────────────────────────────────────────────
TOTAL           350-700        300-610       9,000-18,300

After deduplication:
Unique daily:   220-450
Monthly:        6,600-13,500

Matches found:  50-200/day
Notifications:  20-50 suppliers/day

══════════════════════════════════════════════════════════════════

NEXT STEPS:

1. 📖 Read: OPPORTUNITY_SOURCES_RESEARCH.md
   (Understand each source)

2. 🔑 Get SAM.gov API Key:
   - https://api.data.gov/signup
   - Takes ~5 minutes
   - Optional pero recomendado

3. 📝 Read: MULTI_SOURCE_N8N_SETUP.md
   (Create workflows manually in n8n UI)

4. 🏗️  Create workflows in n8n (1-2 hours total):
   - Workflow 1: HigherGov Scraper
   - Workflow 2: SAM.gov (when key available)
   - Workflow 3: USASpending
   - Workflow 4: Deduplication
   - Workflow 5: Matcher
   - Workflow 6: Notifier

5. ✅ Test each workflow
6. 🟢 Activate all workflows
7. 📊 Monitor in Airtable

══════════════════════════════════════════════════════════════════

API KEYS STATUS:

✅ HigherGov:    4be72a011d644af8bca9a11f85c90d95
⚠️  SAM.gov:      Pending (get from api.data.gov/signup)
✅ USASpending:   None required (public API)
⏳ Grants.gov:    For Phase 2

══════════════════════════════════════════════════════════════════

SUPPORT:

Documentación:
  - OPPORTUNITY_SOURCES_RESEARCH.md - Análisis de fuentes
  - MULTI_SOURCE_N8N_SETUP.md - Guía de configuración
  - MULTI_SOURCE_ARCHITECTURE.md - Arquitectura técnica

Herramientas:
  - scripts/test-n8n-connection.js - Test conexión a n8n
  - scripts/test-supplier-portal.js - Test portal

Status: ✅ Ready to create workflows in n8n UI

`)
