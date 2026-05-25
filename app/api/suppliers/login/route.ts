/**
 * Supplier Login API Route
 * POST /api/suppliers/login
 *
 * Authenticates a supplier by verifying email and password, returns JWT token on success.
 */

import { getSupplierByEmail } from '@/lib/suppliers-client'
import { verifyPassword, generateToken } from '@/lib/suppliers-auth'

/**
 * POST handler for supplier login
 * Validates credentials and returns JWT token on successful authentication
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json()

    // ========================================================================
    // 1. VALIDATE REQUIRED FIELDS
    // ========================================================================
    const { business_email, password } = body

    if (!business_email?.trim() || !password?.trim()) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // ========================================================================
    // 2. VALIDATE EMAIL FORMAT
    // ========================================================================
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(business_email.trim())) {
      return Response.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // ========================================================================
    // 3. FETCH SUPPLIER FROM DATABASE
    // ========================================================================
    let supplier
    try {
      supplier = await getSupplierByEmail(business_email.trim().toLowerCase())
    } catch (dbError) {
      console.error('[API /api/suppliers/login] Database error:', dbError)
      return Response.json(
        { error: 'Login failed' },
        { status: 500 }
      )
    }

    // Supplier not found - return generic error for security
    if (!supplier) {
      return Response.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // ========================================================================
    // 4. VERIFY PASSWORD
    // ========================================================================
    const passwordMatch = await verifyPassword(password, supplier.password_hash || '')
    if (!passwordMatch) {
      return Response.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // ========================================================================
    // 5. GENERATE JWT TOKEN
    // ========================================================================
    let token: string
    try {
      token = generateToken(supplier.supplier_id, supplier.business_email, supplier.legal_name)
    } catch (tokenError) {
      console.error('[API /api/suppliers/login] Token generation error:', tokenError)
      return Response.json(
        { error: 'Login failed' },
        { status: 500 }
      )
    }

    // ========================================================================
    // 6. RETURN SUCCESS RESPONSE
    // ========================================================================
    return Response.json(
      {
        success: true,
        token,
        supplier_id: supplier.supplier_id,
        legal_name: supplier.legal_name,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API /api/suppliers/login] Unexpected error:', error)
    return Response.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
