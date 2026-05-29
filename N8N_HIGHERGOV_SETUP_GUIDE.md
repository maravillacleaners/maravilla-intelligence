# n8n + HigherGov Integration Setup Guide

**Objetivo:** Configurar n8n para descubrir oportunidades federales usando HigherGov API y guardarlas en Airtable.

**Estado:** Manual setup (API v1 requiere workarounds)

---

## Configuración Rápida

### 1. Acceso a n8n

```
URL: https://n8n.srv1112587.hstgr.cloud
Credenciales: (Usar las del Hostinger panel)
```

---

## Workflow 1: HigherGov Opportunity Scraper

**Propósito:** Descubrir oportunidades federales desde HigherGov y guardarlas en Airtable.

**Flujo:**
```
Webhook (POST /webhook/highergov-scraper)
    ↓
HTTP Request a HigherGov API
    ↓
Parse/Transform datos
    ↓
Airtable: Guardar en tabla Intelligence
    ↓
Responder al cliente
```

### Pasos de Configuración:

#### Step 1: Crear Webhook
1. Click en "New Workflow"
2. Nombre: `HigherGov Opportunity Scraper`
3. Agrega nodo: **Webhook**
   - HTTP Method: POST
   - Path: `highergov-scraper`
4. Save & activar

#### Step 2: HigherGov HTTP Request
1. Agrega nodo: **HTTP Request**
2. Conecta desde Webhook
3. Configuración:
   ```
   Method: GET
   URL: https://api.highergov.com/v1/opportunities
   
   Query Parameters:
   - api_key: 4be72a011d644af8bca9a11f85c90d95
   - status: open
   - page: 1
   - per_page: 100
   
   Response Format: JSON
   ```

#### Step 3: Parse Data (Opcional pero recomendado)
1. Agrega nodo: **Code**
2. Tipo: JavaScript
3. Código:
```javascript
const items = $input.all();
if (!items[0]?.json?.opportunities) {
  return [{ json: { error: 'No opportunities found' } }];
}

return items[0].json.opportunities.map(opp => ({
  json: {
    title: opp.title,
    agency: opp.agency,
    record_type: 'opportunity',
    source: 'highergov',
    deadline: opp.deadline,
    estimated_value: opp.estimated_value,
    url: opp.url,
    description: opp.description,
    date_posted: new Date().toISOString(),
  }
}));
```

#### Step 4: Airtable - Guardar Oportunidades
1. Agrega nodo: **Airtable**
2. Conecta desde el nodo anterior
3. Configuración:
   ```
   Operation: Create
   Base ID: appZhXnyFiKbnOZLr
   Table: Intelligence
   
   Field Mapping:
   - title → Title
   - agency → Agency
   - record_type → Type (default: "opportunity")
   - source → Source (default: "highergov")
   - deadline → Deadline
   - estimated_value → Contract Value (USD)
   - url → URL
   - description → Description
   - date_posted → Posted Date
   ```

#### Step 5: Response
1. Agrega nodo: **Respond to Webhook**
2. Conecta desde Airtable
3. Configuración:
   ```
   Status Code: 200
   Response Body: {"success": true, "saved": {{ $json.id }}}
   ```

### Testing:
```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/highergov-scraper \
  -H "Content-Type: application/json" \
  -d '{}'

# O desde Next.js API:
curl -X POST http://localhost:3000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"highergov-scraper"}'
```

### Scheduling:
1. Click en "Trigger" en el workflow
2. Cambiar de "Manual" a "Cron"
3. Expresión: `0 */6 * * *` (cada 6 horas)
4. Save

---

## Workflow 2: Contract Matcher

**Propósito:** Emparejar oportunidades descubiertas con suppliers basado en criterios.

**Flujo:**
```
Webhook (POST /webhook/contract-matcher)
    ↓
Airtable: Read unmatched opportunities
    ↓
Airtable: Read approved suppliers
    ↓
Code: Matching Algorithm
    ↓
Airtable: Save matches to Supplier_Opportunities
    ↓
Responder al cliente
```

### Algoritmo de Matching:
```javascript
Score = (Service Match × 0.60) + (Location Match × 0.20) + (Capacity Match × 0.20)

Umbral mínimo: Score >= 60

Service Match (60%):
- Comparar NAICS codes del supplier vs oportunidad
- Exactitud por coincidencia de códigos

Location Match (20%):
- Verificar si el supplier opera en la región
- 100% si está en lista, 50% si no

Capacity Match (20%):
- Comparar capacidad anual del supplier vs valor del contrato
- 100% si <= 50% de capacidad
- 75% si <= 100%
- 50% si > 100%
```

### Configuración:

#### Paso 1: Webhook
```
HTTP Method: POST
Path: contract-matcher
```

#### Paso 2: Leer Oportunidades
1. Agrega nodo: **Airtable**
2. Configuración:
   ```
   Operation: Read
   Base ID: appZhXnyFiKbnOZLr
   Table: Intelligence
   
   Filter: NOT({matched} = TRUE())
   Max Records: 1000
   ```

#### Paso 3: Leer Suppliers
1. Agrega otro nodo: **Airtable**
2. Configuración:
   ```
   Operation: Read
   Base ID: appZhXnyFiKbnOZLr
   Table: Suppliers
   
   Filter: {registration_status} = 'Approved'
   Max Records: 1000
   ```

#### Paso 4: Matching Algorithm
1. Agrega nodo: **Code**
2. Código (JavaScript):
```javascript
// Obtener datos de ambos inputs
const opportunities = $input.getInputData(0);
const suppliers = $input.getInputData(1);

const matches = [];

opportunities.forEach(opp => {
  const oppData = opp.json;

  suppliers.forEach(sup => {
    const supData = sup.json;

    // Service Match (60%)
    let serviceScore = 75; // Default
    if (oppData.naics_codes && supData.naics_codes) {
      const matchingCodes = oppData.naics_codes.filter(code =>
        supData.naics_codes.includes(code)
      ).length;
      serviceScore = (matchingCodes / Math.max(oppData.naics_codes.length, 1)) * 100;
    }

    // Location Match (20%)
    let locationScore = 50; // Default
    if (supData.preferred_counties?.includes(oppData.place_of_performance)) {
      locationScore = 100;
    }

    // Capacity Match (20%)
    let capacityScore = 75; // Default
    if (supData.estimated_annual_capacity_usd && oppData.estimated_value) {
      const ratio = oppData.estimated_value / supData.estimated_annual_capacity_usd;
      if (ratio <= 0.5) capacityScore = 100;
      else if (ratio <= 1) capacityScore = 75;
      else capacityScore = 50;
    }

    // Calculate total score
    const totalScore = Math.round(
      (serviceScore * 0.6) +
      (locationScore * 0.2) +
      (capacityScore * 0.2)
    );

    // Only include if score >= 60
    if (totalScore >= 60) {
      matches.push({
        json: {
          supplier_id: supData.supplier_id,
          opportunity_id: oppData.id,
          opportunity_name: oppData.title,
          agency: oppData.agency,
          contract_value_usd: oppData.estimated_value,
          deadline: oppData.deadline,
          match_score: totalScore,
          match_reason: \`Services: \${Math.round(serviceScore)}%, Location: \${Math.round(locationScore)}%, Capacity: \${Math.round(capacityScore)}%\`,
          status: 'Available',
          date_matched: new Date().toISOString(),
        }
      });
    }
  });
});

return matches;
```

#### Paso 5: Guardar Matches
1. Agrega nodo: **Airtable**
2. Configuración:
   ```
   Operation: Create
   Base ID: appZhXnyFiKbnOZLr
   Table: Supplier_Opportunities
   ```

#### Paso 6: Response
```
Status Code: 200
Response: {"success": true, "matched": {{ $json.length }}}
```

### Testing & Scheduling:
```bash
# Manual trigger
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/contract-matcher \
  -H "Content-Type: application/json" \
  -d '{}'

# Scheduling: 0 * * * * (cada hora)
```

---

## Workflow 3: Supplier Notifications

**Propósito:** Enviar notificaciones por email a suppliers sobre nuevas oportunidades.

**Flujo:**
```
Webhook (POST /webhook/notifier)
    ↓
Airtable: Read matches not notified
    ↓
Group by Supplier
    ↓
Fetch Supplier Email
    ↓
SendGrid: Send Email
    ↓
Airtable: Mark as notified
    ↓
Responder al cliente
```

### Configuración:

#### Paso 1: Webhook
```
HTTP Method: POST
Path: notifier
```

#### Paso 2: Leer Matches sin Notificar
```
Operation: Read
Base ID: appZhXnyFiKbnOZLr
Table: Supplier_Opportunities

Filter: {notified} != TRUE()
Max Records: 500
```

#### Paso 3: Group by Supplier
```javascript
const items = $input.all();
const grouped = {};

items.forEach(item => {
  const supplierId = item.json.supplier_id;
  if (!grouped[supplierId]) {
    grouped[supplierId] = {
      supplier_id: supplierId,
      opportunities: [],
    };
  }
  grouped[supplierId].opportunities.push({
    name: item.json.opportunity_name,
    agency: item.json.agency,
    value: item.json.contract_value_usd,
    deadline: item.json.deadline,
    match_score: item.json.match_score,
  });
});

return Object.values(grouped).map(g => ({ json: g }));
```

#### Paso 4: Fetch Supplier Info
```
Airtable Operation: Read
Table: Suppliers
Look up by: supplier_id
```

#### Paso 5: SendGrid Email
Configuración:
```
From Email: opportunities@maravilla.example.com
To Email: {{ $json.supplier_email }}
Subject: New Federal Opportunities - {{ $json.count }} matches found
HTML Body: (usar template HTML con handlebars)
```

#### Paso 6: Mark as Notified
```
Airtable Operation: Update
Table: Supplier_Opportunities
Fields to update:
  - notified: true
  - notification_date: {{ now() }}
```

---

## Integración con Next.js API

La app Next.js tiene endpoints que pueden triggerar los workflows:

```javascript
// En app/api/workflows/trigger/route.ts
POST /api/workflows/trigger
{
  "workflowId": "highergov-scraper" | "contract-matcher" | "notifier"
}
```

Esto llama a los webhooks de n8n automáticamente.

---

## Airtable Configuration

### Tabla: Intelligence
Campos requeridos:
- `title` (Text)
- `agency` (Text)
- `record_type` (Single select: opportunity, award, etc)
- `source` (Text: highergov, usaspending, etc)
- `deadline` (Date)
- `estimated_value` (Number)
- `url` (URL)
- `description` (Long text)
- `matched` (Checkbox)
- `date_posted` (Date)

### Tabla: Supplier_Opportunities
Campos requeridos:
- `supplier_id` (Text)
- `opportunity_id` (Text)
- `opportunity_name` (Text)
- `agency` (Text)
- `contract_value_usd` (Number)
- `deadline` (Date)
- `match_score` (Number)
- `match_reason` (Text)
- `status` (Single select: Available, Applied, Won, Lost)
- `date_matched` (Date)
- `notified` (Checkbox)
- `notification_date` (Date)

### Tabla: Suppliers
Campos requeridos:
- `supplier_id` (Text)
- `legal_name` (Text)
- `contact_name` (Text)
- `business_email` (Email)
- `phone` (Phone)
- `sub_category` (Text)
- `registration_status` (Single select: Pending Review, Approved, Rejected)
- `naics_codes` (Link to table or Text array)
- `preferred_counties` (Text array)
- `estimated_annual_capacity_usd` (Number)

---

## Environment Variables Needed

```bash
# .env
HIGHERGOV_API_KEY=4be72a011d644af8bca9a11f85c90d95
AIRTABLE_API_KEY=pat99rdlH4w13bxyF...
AIRTABLE_SUBS_BASE_ID=appZhXnyFiKbnOZLr
SENDGRID_API_KEY=SG.xxxxx (opcional, para emails)
N8N_WEBHOOK_URL=https://n8n.srv1112587.hstgr.cloud
```

---

## Testing Manual

### Test 1: Descubrir Oportunidades
```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/highergov-scraper \
  -H "Content-Type: application/json" \
  -d '{}'

# Verificar: Ir a Airtable > Intelligence table
# Deberías ver 50-100 oportunidades nuevas
```

### Test 2: Emparejar Contratos
```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/contract-matcher \
  -H "Content-Type: application/json" \
  -d '{}'

# Verificar: Ir a Airtable > Supplier_Opportunities table
# Deberías ver matches de suppliers con oportunidades
```

### Test 3: Enviar Notificaciones
```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/notifier \
  -H "Content-Type: application/json" \
  -d '{}'

# Verificar: Supplier debería recibir email con oportunidades
# (si SendGrid está configurado)
```

---

## Troubleshooting

### "No opportunities found"
- Verificar que HigherGov API key es válido
- Asegurar que HigherGov tiene oportunidades disponibles
- Revisar logs en n8n

### "Airtable save failed"
- Verificar AIRTABLE_API_KEY es válido
- Asegurar que el table name es correcto
- Verificar que los field names existen en Airtable

### "Webhook not found"
- Asegurar que el workflow está "Activado" (green toggle)
- Verificar la URL es correcta
- Revisar logs en n8n

### "Email not sent"
- Verificar SENDGRID_API_KEY es válido
- Asegurar que el "from" email está verificado en SendGrid
- Revisar logs en n8n

---

## Próximos Pasos

1. ✅ Configurar Workflow 1: HigherGov Scraper
2. ✅ Configurar Workflow 2: Contract Matcher
3. ✅ Configurar Workflow 3: Notifier (opcional)
4. ✅ Set up Scheduling en n8n UI
5. ✅ Test manual de cada workflow
6. ✅ Monitorear resultados en Airtable
7. ✅ Ajustar thresholds y algoritmos según resultados

---

## Referencias

- **HigherGov Docs:** https://api.highergov.com/docs
- **n8n Docs:** https://docs.n8n.io
- **Airtable API:** https://airtable.com/api
- **SendGrid:** https://sendgrid.com/docs

