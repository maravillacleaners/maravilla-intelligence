# QUICKSTART - Scrapers Investigativos

## 30 segundos de setup

### 1. Verificar .env
```bash
# Agregar esto a .env.local
AIRTABLE_API_KEY=pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92
AIRTABLE_BASE_ID=appZhXnyFiKbnOZLr
```

### 2. Instalar cheerio (si falta)
```bash
npm install cheerio
```

### 3. Listo - PROBAR

```bash
# Terminal
curl -X POST http://localhost:3002/api/scrapers/sunbiz \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Acme Corp","county":"Miami-Dade"}'
```

---

## 4 ENDPOINTS - COPIA & PEGA

### Investigar una empresa COMPLETA (RECOMENDADO)
```bash
curl -X POST http://localhost:3002/api/scrapers/investigator-merge \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Google LLC",
    "entity_type": "Corporation"
  }'
```

Resultado: Perfil integrado con score de investigación, propiedades, contactos, contratos federales, todo.

---

### Buscar empresa en Florida registry
```bash
curl -X POST http://localhost:3002/api/scrapers/sunbiz \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Miami Cleaners Corp",
    "county": "Miami-Dade"
  }'
```

---

### Encontrar contactos de una empresa
```bash
curl -X POST http://localhost:3002/api/scrapers/contact-finder \
  -H "Content-Type: application/json" \
  -d '{
    "company_domain": "google.com"
  }'
```

O por nombre:
```bash
curl -X POST http://localhost:3002/api/scrapers/contact-finder \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Miami Cleaners Corp"
  }'
```

---

### Mapear propiedades
```bash
curl -X POST http://localhost:3002/api/scrapers/property-records \
  -H "Content-Type: application/json" \
  -d '{
    "owner_name": "John Smith",
    "county": "Miami-Dade"
  }'
```

---

## JavaScript/Node.js

```javascript
// Investigar y sacar insights

async function investigate(name) {
  const res = await fetch('/api/scrapers/investigator-merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  
  const result = await res.json()
  const profile = result.avatar_profile
  
  console.log(`
  Empresa: ${profile.name}
  Score: ${profile.investigation_score}/100
  Propiedades: ${profile.properties_count}
  Contactos: ${profile.contacts_count}
  Contratos Federales: $${profile.federal_contract_value}
  Riesgo: ${profile.risk_level}
  `)
  
  return profile
}

investigate('Acme Corp')
```

---

## VARIABLES DE ENTORNO OPCIONALES

Para más fuentes de datos, agregar a .env.local:

```bash
# Contact Intelligence
HUNTER_API_KEY=your_key
APOLLO_API_KEY=your_key
ROCKETREACH_API_KEY=your_key
CLEARBIT_API_KEY=your_key

# Real Estate
ZILLOW_API_KEY=your_key

# Federal Contracts
SAM_API_KEY=your_key

# AI Enrichment
ANTHROPIC_API_KEY=your_key
```

Sin estas, el sistema usa fuentes públicas gratis.

---

## TABLAS AIRTABLE NECESARIAS

El sistema guarda automáticamente en Airtable. Verificar que existan:

- `tblBusinessRegistrations` (Sunbiz data)
- `tblPropertyRecords` (Inmuebles)
- `tblContacts` (Personas)
- `tblAvatars` (Perfiles integrados)
- `tblAwards` (Contratos federales)

Si no existen, crearlas en https://airtable.com/appZhXnyFiKbnOZLr

---

## TROUBLESHOOTING

| Error | Solución |
|-------|----------|
| `ENOTFOUND api.airtable.com` | Sin internet o firewall |
| `HTTP 401` | AIRTABLE_API_KEY inválida |
| `HTTP 404` | Company not found |
| `TIMEOUT` | Fuente lenta, reintentar |
| `0 records` | Ningún dato encontrado (normal para empresas pequeñas) |

---

## FLUJO RECOMENDADO

```javascript
// 1. Investigación rápida (recomendado)
const profile = await POST /api/scrapers/investigator-merge
// → Obtiene TODOO integrado en 1 llamada

// 2. O búsquedas específicas si necesitas más detalle
const company = await POST /api/scrapers/sunbiz
const contacts = await POST /api/scrapers/contact-finder
const properties = await POST /api/scrapers/property-records
```

---

## CASOS REALES

### "Busco clientes federales en Miami"
```javascript
const profile = await POST /api/scrapers/investigator-merge
  { name: "Empresa XYZ" }

if (profile.federal_contract_value > 500000) {
  console.log('⭐ TARGET! Contracts: $' + profile.federal_contract_value)
}
```

### "Quiero info de mi competidor"
```javascript
const profile = await POST /api/scrapers/investigator-merge
  { name: "Miami Cleaners Corp" }

console.log('Propiedades: ' + profile.properties.map(p => p.address))
console.log('Contactos: ' + profile.contacts.map(c => c.email))
```

### "Investigación de due diligence"
```javascript
const profile = await POST /api/scrapers/investigator-merge
  { name: "Potential Partner LLC" }

if (profile.risk_flags.includes('No property records found')) {
  alert('⚠️ Posible shell company')
}
```

---

## MÁS INFO

- **Docs completas:** [README.md](./README.md)
- **Ejemplos avanzados:** [examples.md](./examples.md)
- **Deployment:** [/SCRAPERS_DEPLOYMENT.md](../../SCRAPERS_DEPLOYMENT.md)

---

**¡Listo! Ya puedes investigar avatares como un investigador privado.**

Prueba con: `curl -X POST http://localhost:3002/api/scrapers/investigator-merge -H "Content-Type: application/json" -d '{"name":"test"}'`
