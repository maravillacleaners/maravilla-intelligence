# SCRAPERS INVESTIGATIVOS - Maravilla Intelligence

## Descripción General

Suite completa de scrapers de inteligencia investigativa que funcionan como un **investigador privado digital**. Recopilan información de múltiples fuentes y mapean avatares con relaciones, propiedades, contactos y datos federales.

## Scrapers Disponibles

### 1. SUNBIZ (Florida Division of Corporations)
**Endpoint:** `POST /api/scrapers/sunbiz`

Recopila información de negocios registrados en Florida:
- Nombre legal
- DBA (Doing Business As)
- Fecha de formación
- Status (Activo/Inactivo/Disuelto)
- Número de registro
- Nombres de oficiales/directivos
- Dirección principal
- Teléfono y email

**Input:**
```json
{
  "company_name": "Acme Corp",
  "county": "Miami-Dade"
}
```

**Output:**
```json
{
  "companies": [
    {
      "legal_name": "Acme Corp, Inc.",
      "dba": ["Acme Cleaning", "Acme Services"],
      "date_formed": "2015-06-12",
      "status": "Active",
      "registration_number": "P15000123456",
      "county": "Miami-Dade",
      "officers": [
        {
          "name": "John Smith",
          "title": "President",
          "address": "123 Main St, Miami, FL 33101"
        }
      ],
      "principal_address": "123 Main St, Miami, FL 33101",
      "source": "Sunbiz"
    }
  ],
  "saved_to_airtable": ["rec..."],
  "count": 1
}
```

---

### 2. PROPERTY RECORDS (Zillow / Redfin / Public Records)
**Endpoint:** `POST /api/scrapers/property-records`

Inteligencia de bienes raíces:
- Dirección
- Propietario
- Tipo de propiedad (Residencial/Comercial)
- Valor de mercado
- Lotaje y m²
- Año de construcción
- Impuestos
- Historial de venta
- Pool, garaje, etc.

**Input:**
```json
{
  "address": "123 Main St, Miami, FL 33101",
  "owner_name": "John Smith",
  "county": "Miami-Dade",
  "avatar_id": "rec..."
}
```

**Output:**
```json
{
  "properties": [
    {
      "address": "123 Main St, Miami, FL 33101",
      "county": "Miami-Dade",
      "parcel_id": "MIA123456",
      "owner_name": "John Smith",
      "owner_type": "individual",
      "property_type": "Commercial",
      "square_feet": 5000,
      "lot_size": 12500,
      "year_built": 2010,
      "appraised_value": 850000,
      "market_value": 925000,
      "tax_amount": 12000,
      "beds": 0,
      "baths": 2,
      "garage": 1,
      "pool": false,
      "commercial": true,
      "vacant": false,
      "zoning": "Commercial",
      "deed_date": "2020-03-15",
      "sale_price": 900000
    }
  ],
  "saved_to_airtable": ["rec..."],
  "count": 1
}
```

---

### 3. CONTACT FINDER (Hunter.io / RocketReach / Apollo / Clearbit)
**Endpoint:** `POST /api/scrapers/contact-finder`

Descubre contactos y personas asociadas:
- Nombre completo
- Título / Puesto
- Departamento
- Email verificado
- Teléfono + móvil
- URL LinkedIn
- Dirección
- Confianza (0-100)
- Verificado

**Input:**
```json
{
  "company_name": "Acme Corp",
  "company_domain": "acmecorp.com",
  "email": "john.smith@acmecorp.com",
  "company_id": "rec..."
}
```

**Output:**
```json
{
  "contacts": [
    {
      "name": "John Smith",
      "title": "Facilities Director",
      "department": "Operations",
      "company": "Acme Corp",
      "email": "john.smith@acmecorp.com",
      "phone": "(305) 555-0100",
      "phone_mobile": "(305) 555-0101",
      "linkedin_url": "https://linkedin.com/in/johnsmith",
      "address": "123 Main St",
      "city": "Miami",
      "state": "FL",
      "zip": "33101",
      "confidence": 95,
      "source": "Hunter",
      "verified": true,
      "last_verified": "2026-06-04T10:00:00Z"
    }
  ],
  "saved_to_airtable": ["rec..."],
  "count": 1,
  "sources": ["Hunter", "Apollo", "RocketReach"]
}
```

---

### 4. INVESTIGATOR MERGE (Master Integration)
**Endpoint:** `POST /api/scrapers/investigator-merge`

**ESTO ES LO MÁS IMPORTANTE** - Integra TODA la información de múltiples fuentes en UN PERFIL AVATAR:

- Registros de negocios (Sunbiz)
- Propiedades inmuebles
- Contactos asociados
- Contratos federales
- Relaciones entre entidades
- Score de investigación
- Banderas de riesgo

**Input:**
```json
{
  "name": "Acme Corp",
  "entity_type": "Corporation",
  "county": "Miami-Dade"
}
```

**Output:**
```json
{
  "avatar_profile": {
    "name": "Acme Corp",
    "entity_type": "corporation",
    "relationship_type": "primary",
    "confidence_score": 85,
    "data_sources": ["Sunbiz", "Property Records", "Contact Database", "USASpending"],
    "investigation_score": 92,
    
    "business_registrations": [
      {
        "legal_name": "Acme Corp, Inc.",
        "status": "Active",
        "registration_number": "P15000123456",
        "date_formed": "2015-06-12",
        "county": "Miami-Dade"
      }
    ],
    
    "properties": [
      {
        "address": "123 Main St, Miami, FL 33101",
        "county": "Miami-Dade",
        "property_type": "Commercial",
        "market_value": 925000
      }
    ],
    
    "contacts": [
      {
        "name": "John Smith",
        "title": "Facilities Director",
        "department": "Operations",
        "email": "john.smith@acmecorp.com",
        "phone": "(305) 555-0100"
      }
    ],
    
    "federal_contracts": [
      {
        "recipient": "Acme Corp",
        "amount": 250000,
        "agency": "GSA",
        "date": "2024-03-15"
      }
    ],
    
    "relationships": [
      {
        "related_avatar": "Smith Cleaning Services",
        "relationship": "competitor",
        "confidence": 75
      }
    ],
    
    "risk_flags": [
      "High federal contract exposure ($250K)",
      "Potential competitor in commercial cleaning"
    ],
    
    "properties_count": 1,
    "contacts_count": 5,
    "federal_contracts": 2,
    "federal_contract_value": 500000,
    "relationships_count": 1,
    "last_updated": "2026-06-04T10:00:00Z"
  },
  "saved_to_airtable": "rec...",
  "investigation_complete": true
}
```

---

## Configuración (Environment Variables)

Requerida en `.env`:

```bash
# Airtable
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=appZhXnyFiKbnOZLr

# Contact APIs (opcionales - usa fallbacks si no configurados)
HUNTER_API_KEY=...
ROCKETREACH_API_KEY=...
APOLLO_API_KEY=...
CLEARBIT_API_KEY=...

# Property Records (opcional)
ZILLOW_API_KEY=...

# Anthropic (para enriquecimiento AI)
ANTHROPIC_API_KEY=...
```

---

## Integración con Airtable

Todos los scrapers guardan automáticamente en:

| Scraper | Tabla Airtable | Campos |
|---------|---|---|
| Sunbiz | `tblBusinessRegistrations` | legal_name, dba_names, status, registration_number, officers_json, etc. |
| Property Records | `tblPropertyRecords` | address, parcel_id, owner_name, market_value, zoning, etc. |
| Contact Finder | `tblContacts` | name, title, email, phone, linkedin_url, company, etc. |
| Investigator Merge | `tblAvatars` | name, investigation_score, data_sources_json, risk_flags_json, etc. |

---

## Flujo de Investigación Típico

### Escenario: Investigar competidor o prospecto

```
1. POST /api/scrapers/sunbiz
   Input: {"company_name": "Acme Corp", "county": "Miami-Dade"}
   → Obtener registro legal, oficiales, dirección

2. POST /api/scrapers/property-records
   Input: {"owner_name": "Acme Corp", "county": "Miami-Dade"}
   → Descubrir propiedades inmuebles

3. POST /api/scrapers/contact-finder
   Input: {"company_name": "Acme Corp", "company_domain": "acmecorp.com"}
   → Encontrar contactos clave

4. POST /api/scrapers/investigator-merge
   Input: {"name": "Acme Corp", "entity_type": "Corporation", "county": "Miami-Dade"}
   → INTEGRAR TODO en UN perfil avatar
   → Calcular investigation_score
   → Identificar relaciones y riesgos
```

---

## Límites de Rate

| API | Límite |
|-----|--------|
| Sunbiz | 500 req/día (público) |
| Zillow | Depende de plan (requiere API key) |
| Hunter.io | Depende de plan (incluye búsquedas gratis) |
| RocketReach | Depende de plan |
| Apollo | 100,000 records/mes (plan típico) |
| Clearbit | 100 req/día (free tier) |

---

## Banderas de Riesgo Automáticas

El sistema identifica automáticamente:

- ✅ High property portfolio (>5 propiedades)
- ✅ High federal contract exposure (>$1M)
- ✅ Low confidence data (<30)
- ✅ No property records found
- ✅ No contact information discovered
- ✅ No federal contract history
- ✅ Potential duplicate/shell company
- ✅ Competitor detection
- ✅ Profile construction errors

---

## Ejemplos de Uso

### cURL - Sunbiz
```bash
curl -X POST http://localhost:3002/api/scrapers/sunbiz \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Miami Cleaners Corp",
    "county": "Miami-Dade"
  }'
```

### cURL - Investigator Merge
```bash
curl -X POST http://localhost:3002/api/scrapers/investigator-merge \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Miami Cleaners Corp",
    "entity_type": "Corporation",
    "county": "Miami-Dade"
  }'
```

### JavaScript/Node.js
```javascript
const response = await fetch('/api/scrapers/investigator-merge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Miami Cleaners Corp",
    entity_type: "Corporation",
    county: "Miami-Dade"
  })
})

const result = await response.json()
console.log(`Investigation Score: ${result.avatar_profile.investigation_score}/100`)
console.log(`Risk Flags: ${result.avatar_profile.risk_flags}`)
console.log(`Federal Contracts: $${result.avatar_profile.federal_contract_value}`)
```

---

## Notas Importantes

1. **Privacy & Legal**: Todos los datos provienen de fuentes públicas. Para datos privados, verificar FCRA compliance.

2. **Rate Limiting**: Implementar backoff exponencial si necesario.

3. **Fallbacks**: Si un API falla, los scrapers continúan con otras fuentes.

4. **Deduplicación**: Contact Finder deduplica automáticamente por email.

5. **Investigation Score**: Calculado como:
   - Base: confidence_score (0-100)
   - +5 por cada propiedad
   - +3 por cada contacto
   - +20 si hay contratos federales
   - Máximo: 100

6. **Actualización**: Cada perfil tiene timestamp de última actualización. Considerar re-scraping cada 30-90 días.

---

## Debugging

**Logs en consola:**
```
[SUNBIZ] Buscando: Acme Corp
[SUNBIZ] Encontrados 1 resultados
[PROPERTY] Buscando: 123 Main St, Miami, FL 33101
[AIRTABLE] Avatar guardado: Acme Corp (rec...)
[INVESTIGATOR] Perfil completado: 92/100
```

**Errores comunes:**
- `AIRTABLE_API_KEY no configurada` → Agregar a .env
- `HTTP 429` → Rate limit hit, esperar o incrementar API plan
- `HTTP 404` → Empresa/contacto no encontrado en fuente
- `TIMEOUT` → Fuente lenta, reintentar con backoff

---

## Roadmap

- [ ] Integración Google Reverse Image Search
- [ ] Integración LinkedIn API (para perfiles verificados)
- [ ] Social media scraping (Facebook, Instagram, Twitter)
- [ ] Blockchain analysis (si aplica)
- [ ] Tax records integration
- [ ] Court records scraping
- [ ] News & article monitoring
- [ ] Real-time alerts para cambios
- [ ] Visualization dashboard

---

**Creado:** 2026-06-04  
**Version:** 1.0 - Production Ready
