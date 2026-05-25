/**
 * Supplier Authentication Library
 * Handles password hashing, JWT token generation/verification, and request authentication
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { SUPPLIERS_CONFIG } from '@/config/suppliers-config'

/**
 * JWT Payload interface for supplier tokens
 */
export interface SupplierJWT {
  supplier_id: string
  business_email: string
  legal_name: string
  iat: number
  exp: number
}

/**
 * Hash a password using bcryptjs (10 rounds)
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(password, salt)
    return hashed
  } catch (error) {
    throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hash - Previously hashed password from database
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    throw new Error(`Failed to verify password: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate a JWT token for supplier authentication
 * @param supplierId - Unique supplier identifier
 * @param email - Supplier's business email
 * @param legalName - Supplier's legal business name
 * @returns JWT token string
 */
export function generateToken(supplierId: string, email: string, legalName: string): string {
  const secret = process.env.JWT_SECRET_SUPPLIER

  if (!secret) {
    throw new Error('JWT_SECRET_SUPPLIER environment variable is not set')
  }

  const payload: Omit<SupplierJWT, 'iat' | 'exp'> = {
    supplier_id: supplierId,
    business_email: email,
    legal_name: legalName,
  }

  try {
    const token = jwt.sign(payload, secret, {
      expiresIn: SUPPLIERS_CONFIG.JWT_EXPIRY,
      algorithm: SUPPLIERS_CONFIG.TOKEN.ALGORITHM as jwt.Algorithm,
      issuer: SUPPLIERS_CONFIG.TOKEN.ISSUER,
    })
    return token
  } catch (error) {
    throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Decoded token payload or null if invalid/expired
 */
export function verifyToken(token: string): SupplierJWT | null {
  const secret = process.env.JWT_SECRET_SUPPLIER

  if (!secret) {
    console.error('JWT_SECRET_SUPPLIER environment variable is not set')
    return null
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: [SUPPLIERS_CONFIG.TOKEN.ALGORITHM as jwt.Algorithm],
      issuer: SUPPLIERS_CONFIG.TOKEN.ISSUER,
    })

    return decoded as SupplierJWT
  } catch (error) {
    // Token is invalid, expired, or tampered with
    if (error instanceof jwt.TokenExpiredError) {
      console.debug('Token has expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.debug('Invalid token')
    } else {
      console.debug('Token verification failed:', error instanceof Error ? error.message : 'Unknown error')
    }
    return null
  }
}

/**
 * Extract and verify supplier JWT token from request Authorization header
 * Expects header format: "Bearer <token>"
 * @param request - HTTP request object with headers
 * @returns Decoded token payload or null if missing/invalid
 */
export function getSupplierFromRequest(request: Request): SupplierJWT | null {
  try {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return null
    }

    // Extract token from "Bearer <token>" format
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null
    }

    const token = parts[1]
    return verifyToken(token)
  } catch (error) {
    console.debug('Failed to extract supplier from request:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Generate a random 6-character alphanumeric verification code
 * Used for email verification and password reset flows
 * @returns Promise resolving to 6-character code
 */
export async function generateVerificationCode(): Promise<string> {
  // Generate random bytes and convert to alphanumeric
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''

  for (let i = 0; i < 6; i++) {
    // Use crypto for randomness
    const randomByte = new Uint8Array(1)
    crypto.getRandomValues(randomByte)
    code += chars[randomByte[0] % chars.length]
  }

  return code
}

/**
 * Validate password against configured policy
 * @param password - Password to validate
 * @returns Object with validation result and error message if invalid
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  const policy = SUPPLIERS_CONFIG.PASSWORD_POLICY

  if (password.length < policy.MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${policy.MIN_LENGTH} characters long`,
    }
  }

  if (policy.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
    }
  }

  if (policy.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter',
    }
  }

  if (policy.REQUIRE_NUMBERS && !/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
    }
  }

  if (policy.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character',
    }
  }

  return { valid: true }
}
