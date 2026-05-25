/**
 * Supplier Registration API Route
 * POST /api/suppliers/register
 *
 * Registers a new supplier account with validation, password hashing, and JWT token generation.
 */

import { createSupplier, getSupplierByEmail } from '@/lib/suppliers-client'
import { hashPassword, generateToken, validatePassword } from '@/lib/suppliers-auth'

/**
 * POST handler for supplier registration
 * Validates registration data, creates supplier record, and returns JWT token
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json()

    // ========================================================================
    // 1. VALIDATE REQUIRED FIELDS
    // ========================================================================
    const required = [
      'legal_name',
      'contact_name',
      'business_email',
      'phone',
      'password',
      'sub_category',
    ]

    for (const field of required) {
      if (!body[field] || typeof body[field] !== 'string' || !body[field].trim()) {
        return Response.json(
          { error: `Missing or invalid required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // ========================================================================
    // 2. VALIDATE EMAIL FORMAT
    // ========================================================================
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.business_email.trim())) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // ========================================================================
    // 3. VALIDATE PASSWORD WITH POLICY
    // ========================================================================
    const passwordValidation = validatePassword(body.password)
    if (!passwordValidation.valid) {
      return Response.json({ error: passwordValidation.error }, { status: 400 })
    }

    // ========================================================================
    // 4. CHECK IF EMAIL ALREADY EXISTS
    // ========================================================================
    console.log('[API /api/suppliers/register] Checking if email exists:', body.business_email.trim().toLowerCase())
    const existingSupplier = await getSupplierByEmail(body.business_email.trim().toLowerCase())
    console.log('[API /api/suppliers/register] Email check result:', existingSupplier ? 'exists' : 'new')
    if (existingSupplier) {
      return Response.json({ error: 'Email already registered' }, { status: 409 })
    }

    // ========================================================================
    // 5. HASH PASSWORD
    // ========================================================================
    let passwordHash: string
    try {
      passwordHash = await hashPassword(body.password)
    } catch (hashError) {
      console.error('[API /api/suppliers/register] Password hashing error:', hashError)
      return Response.json(
        { error: 'Failed to process password' },
        { status: 500 }
      )
    }

    // ========================================================================
    // 6. CREATE SUPPLIER IN DATABASE
    // ========================================================================
    let supplier
    try {
      supplier = await createSupplier({
        legal_name: body.legal_name.trim(),
        contact_name: body.contact_name.trim(),
        business_email: body.business_email.trim().toLowerCase(),
        phone: body.phone.trim(),
        website: body.website ? body.website.trim() : undefined,
        sub_category: body.sub_category.trim(),
        services_offered: Array.isArray(body.services_offered) ? body.services_offered : [],
        preferred_counties: Array.isArray(body.preferred_counties) ? body.preferred_counties : [],
        estimated_annual_capacity_usd: body.estimated_annual_capacity_usd
          ? parseInt(body.estimated_annual_capacity_usd)
          : undefined,
        certification_status: body.certification_status || undefined,
        sam_gov_id: body.sam_gov_id || undefined,
        cage_code: body.cage_code || undefined,
        insurance_certificate_url: body.insurance_certificate_url || undefined,
        registration_status: 'Pending Review',
        password_hash: passwordHash,
      })
    } catch (dbError) {
      const errorMsg = dbError instanceof Error ? dbError.message : typeof dbError === 'string' ? dbError : JSON.stringify(dbError);
      console.error('[API /api/suppliers/register] Database error:', dbError, 'Message:', errorMsg)
      return Response.json(
        {
          error: 'Failed to create supplier account',
          details: errorMsg,
        },
        { status: 500 }
      )
    }

    // ========================================================================
    // 7. GENERATE JWT TOKEN
    // ========================================================================
    let token: string
    try {
      token = generateToken(supplier.supplier_id, supplier.business_email, supplier.legal_name)
    } catch (tokenError) {
      console.error('[API /api/suppliers/register] Token generation error:', tokenError)
      return Response.json(
        { error: 'Failed to generate authentication token' },
        { status: 500 }
      )
    }

    // ========================================================================
    // 8. RETURN SUCCESS RESPONSE
    // ========================================================================
    return Response.json(
      {
        success: true,
        token,
        supplier_id: supplier.supplier_id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API /api/suppliers/register] Unexpected error:', error)
    return Response.json(
      {
        error: 'Failed to register supplier',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
