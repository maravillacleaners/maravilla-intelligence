# EJEMPLOS DE USO - Scrapers Investigativos

## 1. Sunbiz - Investigar una Empresa

### Caso: Buscar registro de "Acme Corporation" en Miami-Dade

```bash
curl -X POST http://localhost:3002/api/scrapers/sunbiz \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Acme Corporation",
    "county": "Miami-Dade"
  }'
```

**Respuesta esperada:**
```json
{
  "companies": [
    {
      "legal_name": "ACME CORPORATION, INC.",
      "dba": ["Acme Services", "Acme Cleaning LLC"],
      "date_formed": "2015-06-15",
      "status": "Active",
      "registration_number": "P15000123456",
      "county": "Miami-Dade",
      "officers": [
        {
          "name": "John Smith",
          "title": "President",
          "address": "123 Main St, Miami, FL 33101"
        },
        {
          "name": "Sarah Johnson",
          "title": "Secretary",
          "address": "123 Main St, Miami, FL 33101"
        }
      ],
      "principal_address": "123 Main St, Miami, FL 33101",
      "phone": "(305) 555-0100",
      "email": "info@acmecorp.com",
      "source": "Sunbiz"
    }
  ],
  "saved_to_airtable": ["recXXXXXXXXXXXXXX"],
  "count": 1,
  "source": "Sunbiz (Florida Division of Corporations)",
  "timestamp": "2026-06-04T12:00:00Z"
}
```

---

## 2. Property Records - Mapear Propiedades

### Caso A: Buscar propiedades de una dirección

```bash
curl -X POST http://localhost:3002/api/scrapers/property-records \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Main St, Miami, FL 33101",
    "avatar_id": "recXXXXXXXXXXXXXX"
  }'
```

### Caso B: Buscar todas las propiedades de un propietario

```bash
curl -X POST http://localhost:3002/api/scrapers/property-records \
  -H "Content-Type: application/json" \
  -d '{
    "owner_name": "John Smith",
    "county": "Miami-Dade",
    "avatar_id": "recXXXXXXXXXXXXXX"
  }'
```

**Respuesta esperada:**
```json
{
  "properties": [
    {
      "address": "123 Main St, Miami, FL 33101",
      "county": "Miami-Dade",
      "parcel_id": "MIA00-12-345-6789",
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
      "garage": 2,
      "pool": false,
      "commercial": true,
      "vacant": false,
      "zoning": "Commercial",
      "legal_description": "LOT 5, BLOCK 10, MIAMI DOWNTOWN PLAZA",
      "deed_date": "2020-03-15",
      "sale_price": 900000
    },
    {
      "address": "456 Oak Ave, Miami, FL 33102",
      "county": "Miami-Dade",
      "parcel_id": "MIA00-12-345-6790",
      "owner_name": "John Smith",
      "owner_type": "individual",
      "property_type": "Residential",
      "square_feet": 2500,
      "lot_size": 8000,
      "year_built": 2005,
      "appraised_value": 450000,
      "market_value": 500000,
      "tax_amount": 6500,
      "beds": 4,
      "baths": 2,
      "garage": 2,
      "pool": true,
      "commercial": false,
      "vacant": false,
      "zoning": "Residential",
      "legal_description": "LOT 12, BLOCK 5, RIVERSIDE ESTATES",
      "deed_date": "2018-09-20",
      "sale_price": 480000
    }
  ],
  "saved_to_airtable": ["rec1111111111111", "rec2222222222222"],
  "count": 2,
  "source": "Property Records",
  "timestamp": "2026-06-04T12:00:00Z"
}
```

---

## 3. Contact Finder - Descubrir Personas

### Caso A: Buscar contactos por dominio de email

```bash
curl -X POST http://localhost:3002/api/scrapers/contact-finder \
  -H "Content-Type: application/json" \
  -d '{
    "company_domain": "acmecorp.com",
    "company_id": "recXXXXXXXXXXXXXX"
  }'
```

### Caso B: Buscar contactos por nombre de empresa

```bash
curl -X POST http://localhost:3002/api/scrapers/contact-finder \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Acme Corporation",
    "company_id": "recXXXXXXXXXXXXXX"
  }'
```

### Caso C: Enriquecer un email individual

```bash
curl -X POST http://localhost:3002/api/scrapers/contact-finder \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.smith@acmecorp.com"
  }'
```

**Respuesta esperada:**
```json
{
  "contacts": [
    {
      "name": "John Smith",
      "title": "Director of Facilities Management",
      "department": "Operations",
      "company": "Acme Corporation",
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
      "last_verified": "2026-06-04T12:00:00Z"
    },
    {
      "name": "Sarah Johnson",
      "title": "Procurement Manager",
      "department": "Procurement",
      "company": "Acme Corporation",
      "email": "sarah.johnson@acmecorp.com",
      "phone": "(305) 555-0200",
      "phone_mobile": "(305) 555-0201",
      "linkedin_url": "https://linkedin.com/in/sarahjohnson",
      "address": "123 Main St",
      "city": "Miami",
      "state": "FL",
      "zip": "33101",
      "confidence": 88,
      "source": "Apollo",
      "verified": true,
      "last_verified": "2026-06-04T12:00:00Z"
    }
  ],
  "saved_to_airtable": ["recAAAAAAAAAAAAA", "recBBBBBBBBBBBBB"],
  "count": 2,
  "sources": ["Hunter", "Apollo", "RocketReach"]
}
```

---

## 4. Investigator Merge - Perfil Completo (RECOMENDADO)

### Caso: Investigación integral de una empresa

```bash
curl -X POST http://localhost:3002/api/scrapers/investigator-merge \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "entity_type": "Corporation",
    "county": "Miami-Dade"
  }'
```

**Respuesta esperada (COMPLETA):**
```json
{
  "avatar_profile": {
    "name": "Acme Corporation",
    "entity_type": "corporation",
    "relationship_type": "primary",
    "confidence_score": 85,
    "investigation_score": 92,
    "data_sources": ["Sunbiz", "Property Records", "Contact Database", "USASpending"],
    
    "phone": "(305) 555-0100",
    "email": "info@acmecorp.com",
    "linkedin": "https://linkedin.com/company/acmecorp",
    "address": "123 Main St",
    "city": "Miami",
    "state": "FL",
    "zip": "33101",
    
    "business_registrations": [
      {
        "legal_name": "ACME CORPORATION, INC.",
        "status": "Active",
        "registration_number": "P15000123456",
        "date_formed": "2015-06-15",
        "county": "Miami-Dade"
      }
    ],
    
    "properties": [
      {
        "address": "123 Main St, Miami, FL 33101",
        "county": "Miami-Dade",
        "property_type": "Commercial",
        "market_value": 925000
      },
      {
        "address": "456 Oak Ave, Miami, FL 33102",
        "county": "Miami-Dade",
        "property_type": "Residential",
        "market_value": 500000
      }
    ],
    
    "contacts": [
      {
        "name": "John Smith",
        "title": "Director of Facilities Management",
        "department": "Facilities",
        "email": "john.smith@acmecorp.com",
        "phone": "(305) 555-0100"
      },
      {
        "name": "Sarah Johnson",
        "title": "Procurement Manager",
        "department": "Procurement",
        "email": "sarah.johnson@acmecorp.com",
        "phone": "(305) 555-0200"
      }
    ],
    
    "federal_contracts": [
      {
        "recipient": "Acme Corporation",
        "amount": 250000,
        "agency": "General Services Administration (GSA)",
        "date": "2024-03-15"
      },
      {
        "recipient": "Acme Corporation",
        "amount": 350000,
        "agency": "Department of Defense",
        "date": "2024-01-10"
      }
    ],
    
    "relationships": [
      {
        "related_avatar": "Smith Cleaning Services",
        "relationship": "competitor",
        "confidence": 75
      },
      {
        "related_avatar": "Johnson & Associates",
        "relationship": "partner",
        "confidence": 65
      }
    ],
    
    "risk_flags": [
      "High federal contract exposure ($600K total)",
      "Potential competitor in commercial cleaning market"
    ],
    "risk_level": "medium",
    
    "properties_count": 2,
    "contacts_count": 5,
    "federal_contracts": 2,
    "federal_contract_value": 600000,
    "relationships_count": 2,
    
    "last_updated": "2026-06-04T12:00:00Z"
  },
  
  "saved_to_airtable": "recXXXXXXXXXXXXXX",
  "investigation_complete": true,
  "timestamp": "2026-06-04T12:00:00Z"
}
```

---

## 5. Casos de Uso Prácticos

### Flujo 1: Investigar un Competidor

```javascript
// 1. Obtener registro de empresa
const sunbizResult = await fetch('/api/scrapers/sunbiz', {
  method: 'POST',
  body: JSON.stringify({
    company_name: "Miami Cleaners Inc",
    county: "Miami-Dade"
  })
})

const company = await sunbizResult.json()
const companyId = company.companies[0]?.registration_number

// 2. Encontrar contactos clave
const contactsResult = await fetch('/api/scrapers/contact-finder', {
  method: 'POST',
  body: JSON.stringify({
    company_name: "Miami Cleaners Inc",
    company_id: companyId
  })
})

const contacts = await contactsResult.json()
const facilityDirector = contacts.contacts.find(c => c.title.includes('Facilities'))

// 3. Mapear propiedades
const propsResult = await fetch('/api/scrapers/property-records', {
  method: 'POST',
  body: JSON.stringify({
    owner_name: "Miami Cleaners Inc",
    county: "Miami-Dade"
  })
})

// 4. Obtener perfil completo
const investigationResult = await fetch('/api/scrapers/investigator-merge', {
  method: 'POST',
  body: JSON.stringify({
    name: "Miami Cleaners Inc",
    entity_type: "Corporation",
    county: "Miami-Dade"
  })
})

const investigation = await investigationResult.json()
console.log(`Investigation Score: ${investigation.avatar_profile.investigation_score}/100`)
console.log(`Federal Contracts: $${investigation.avatar_profile.federal_contract_value}`)
console.log(`Risk Flags: ${investigation.avatar_profile.risk_flags}`)
```

### Flujo 2: Prospección de Clientes

```javascript
// Buscar empresas con contratos federales en nuestra área

const investigationResult = await fetch('/api/scrapers/investigator-merge', {
  method: 'POST',
  body: JSON.stringify({
    name: "Prime Federal Contractor XYZ",
    entity_type: "Corporation",
    county: "Miami-Dade"
  })
})

const profile = await investigationResult.json()

if (profile.avatar_profile.federal_contract_value > 500000) {
  console.log(`TARGET: ${profile.avatar_profile.name}`)
  console.log(`Federal Contracts: $${profile.avatar_profile.federal_contract_value}`)
  
  const facilities = profile.avatar_profile.contacts.filter(
    c => c.department === 'Facilities' || c.title.includes('Director')
  )
  
  console.log(`Key Contacts: ${facilities.map(c => c.email).join(', ')}`)
}
```

---

## 6. Parámetros Opcionales

### Todos los endpoints aceptan parámetros GET también:

```bash
# GET equivalente a POST
curl "http://localhost:3002/api/scrapers/sunbiz?company_name=Acme&county=Miami-Dade"

curl "http://localhost:3002/api/scrapers/property-records?address=123%20Main%20St&owner_name=John%20Smith"

curl "http://localhost:3002/api/scrapers/contact-finder?company_domain=acmecorp.com"

curl "http://localhost:3002/api/scrapers/investigator-merge?name=Acme%20Corp&entity_type=Corporation"
```

---

## 7. Manejo de Errores

### Error: Empresa no encontrada

```json
{
  "error": "Scraper error",
  "details": "No results found for search term",
  "count": 0,
  "companies": [],
  "saved_to_airtable": []
}
```

### Error: API no configurada

```json
{
  "error": "contact_finder disabled",
  "message": "HUNTER_API_KEY not configured",
  "fallback": "Using limited public search"
}
```

### Error: Rate limit

```json
{
  "error": "Rate limit exceeded",
  "retry_after_seconds": 3600,
  "message": "Daily limit reached for this API"
}
```

---

## 8. Testing con Postman

Importar esta colección en Postman:

```json
{
  "info": {
    "name": "Maravilla Scrapers",
    "description": "Investigative Scraper APIs"
  },
  "item": [
    {
      "name": "Sunbiz - Search Company",
      "request": {
        "method": "POST",
        "url": "http://localhost:3002/api/scrapers/sunbiz",
        "body": {
          "mode": "raw",
          "raw": "{\"company_name\": \"Acme Corp\", \"county\": \"Miami-Dade\"}"
        }
      }
    },
    {
      "name": "Contact Finder - By Domain",
      "request": {
        "method": "POST",
        "url": "http://localhost:3002/api/scrapers/contact-finder",
        "body": {
          "mode": "raw",
          "raw": "{\"company_domain\": \"acmecorp.com\"}"
        }
      }
    },
    {
      "name": "Investigator Merge - Full Profile",
      "request": {
        "method": "POST",
        "url": "http://localhost:3002/api/scrapers/investigator-merge",
        "body": {
          "mode": "raw",
          "raw": "{\"name\": \"Acme Corp\", \"entity_type\": \"Corporation\"}"
        }
      }
    }
  ]
}
```

---

## 9. Performance Tips

1. **Cache resultados**: Guarda resultados en Airtable y reutiliza en 30 días
2. **Batch requests**: Si necesitas investigar múltiples empresas, usa bucles con delays
3. **Prioriza Investigator Merge**: Es más eficiente que hacer 4 llamadas separadas
4. **Manejo de errores**: Implementa fallbacks para APIs no configuradas

```javascript
// Ejemplo: Investigar 10 empresas con delay
const companies = ['Acme', 'Beta', 'Gamma', /* ... */]

for (const company of companies) {
  const result = await fetch('/api/scrapers/investigator-merge', {
    method: 'POST',
    body: JSON.stringify({ name: company })
  })
  
  console.log(await result.json())
  
  // Delay para respetar rate limits
  await new Promise(resolve => setTimeout(resolve, 2000))
}
```

---

**Documentación creada:** 2026-06-04
