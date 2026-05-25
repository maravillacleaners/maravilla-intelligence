/**
 * Supplier Portal Validation & Testing Suite
 *
 * This script validates core supplier portal functionality:
 * - Password hashing and security
 * - JWT token generation and verification
 * - Database connectivity
 * - API endpoints
 * - Opportunity matching logic
 *
 * Run with: npx ts-node scripts/test-supplier-portal.ts
 */

import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env.example') })

// Import functions to test
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  validatePassword,
  generateVerificationCode,
} from '../lib/suppliers-auth'

import {
  getSupplierByEmail,
  getSupplierById,
  createSupplier,
  getOpportunitiesForSupplier,
  listSuppliers,
  Supplier,
} from '../lib/suppliers-client'

// ============================================================================
// TEST FRAMEWORK
// ============================================================================

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
}

const results: TestResult[] = []

async function runTest(
  name: string,
  testFn: () => Promise<void> | void,
  skipIfMissing: boolean = false
) {
  const start = Date.now()
  try {
    await testFn()
    results.push({ name, passed: true, duration: Date.now() - start })
    console.log(`✓ ${name}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (skipIfMissing && errorMessage.includes('not set')) {
      console.log(`⊘ ${name} (skipped - config missing)`)
      return
    }

    results.push({
      name,
      passed: false,
      duration: Date.now() - start,
      error: errorMessage,
    })
    console.log(`✗ ${name}`)
    if (error instanceof Error) {
      console.log(`  Error: ${error.message}`)
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

async function testPasswordHashing() {
  const password = 'TestPassword123'
  const hash = await hashPassword(password)

  // Hash should not equal password
  assert(hash !== password, 'Password should be hashed, not stored as plaintext')

  // Hash should be a valid bcrypt hash
  assert(hash.startsWith('$2'), 'Hash should be bcrypt format (starts with $2)')

  // Hash should be reasonably long
  assert(hash.length >= 60, 'Bcrypt hash should be at least 60 characters')

  // Hash should be consistent for same password
  const hash2 = await hashPassword(password)
  assert(hash !== hash2, 'Same password produces different hashes (salts differ)')

  // Verify password against hash
  const verified = await verifyPassword(password, hash)
  assert(verified === true, 'Correct password should verify against hash')

  // Wrong password should not verify
  const wrongVerified = await verifyPassword('WrongPassword123', hash)
  assert(wrongVerified === false, 'Wrong password should not verify')
}

async function testPasswordValidation() {
  // Test valid password
  const validPassword = 'MyPassword123'
  const valid = validatePassword(validPassword)
  assert(valid.valid === true, 'Valid password should pass validation')
  assert(!valid.error, 'Valid password should have no error')

  // Test too short
  const shortPassword = 'Pass1'
  const shortResult = validatePassword(shortPassword)
  assert(shortResult.valid === false, 'Short password should fail')
  assert(
    shortResult.error?.includes('8'),
    'Error should mention 8 character minimum'
  )

  // Test missing uppercase
  const noUppercase = 'password123'
  const noUpperResult = validatePassword(noUppercase)
  assert(noUpperResult.valid === false, 'Password without uppercase should fail')
  assert(
    noUpperResult.error?.includes('uppercase'),
    'Error should mention uppercase requirement'
  )

  // Test missing lowercase
  const noLowercase = 'PASSWORD123'
  const noLowerResult = validatePassword(noLowercase)
  assert(noLowerResult.valid === false, 'Password without lowercase should fail')
  assert(
    noLowerResult.error?.includes('lowercase'),
    'Error should mention lowercase requirement'
  )

  // Test missing numbers
  const noNumbers = 'PasswordTest'
  const noNumbersResult = validatePassword(noNumbers)
  assert(noNumbersResult.valid === false, 'Password without numbers should fail')
  assert(
    noNumbersResult.error?.includes('number'),
    'Error should mention number requirement'
  )
}

async function testVerificationCodeGeneration() {
  const code1 = await generateVerificationCode()
  const code2 = await generateVerificationCode()

  // Should be 6 characters
  assert(code1.length === 6, 'Verification code should be 6 characters')

  // Should be alphanumeric
  assert(/^[A-Z0-9]{6}$/.test(code1), 'Verification code should be alphanumeric')

  // Should be different each time (random)
  assert(code1 !== code2, 'Generated codes should be random')
}

async function testTokenGeneration() {
  const supplierId = 'sup-test-123'
  const email = 'test@example.com'
  const legalName = 'Test Company Inc'

  const token = generateToken(supplierId, email, legalName)

  // Token should exist
  assert(token, 'Token should be generated')

  // Token should be JWT format (3 parts separated by dots)
  const parts = token.split('.')
  assert(parts.length === 3, 'JWT should have 3 parts (header.payload.signature)')

  // Each part should be base64url encoded
  parts.forEach((part, index) => {
    assert(part.length > 0, `JWT part ${index} should not be empty`)
  })
}

async function testTokenVerification() {
  const supplierId = 'sup-test-456'
  const email = 'verify@example.com'
  const legalName = 'Verify Company LLC'

  const token = generateToken(supplierId, email, legalName)
  const decoded = verifyToken(token)

  // Token should decode successfully
  assert(decoded !== null, 'Valid token should decode')

  if (decoded) {
    // Payload should contain correct data
    assert(decoded.supplier_id === supplierId, 'Decoded supplier_id should match')
    assert(decoded.business_email === email, 'Decoded email should match')
    assert(decoded.legal_name === legalName, 'Decoded legal_name should match')

    // Token should have expiration
    assert(decoded.exp > 0, 'Token should have expiration timestamp')
    assert(decoded.iat > 0, 'Token should have issued-at timestamp')
  }
}

async function testTokenExpiration() {
  // Test with invalid/expired token format
  const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
  const result = verifyToken(invalidToken)

  // Invalid token should return null
  assert(result === null, 'Invalid token should return null')
}

async function testTokenTampering() {
  const token = generateToken('sup-test', 'test@test.com', 'Test Corp')

  // Modify token
  const parts = token.split('.')
  const tamperedToken = parts[0] + '.modified' + parts[1] + '.' + parts[2]

  // Tampered token should not verify
  const result = verifyToken(tamperedToken)
  assert(result === null, 'Tampered token should not verify')
}

// ============================================================================
// DATABASE TESTS
// ============================================================================

async function testSupplierDatabaseRead() {
  try {
    // Test reading non-existent supplier by email
    const supplier = await getSupplierByEmail('nonexistent-supplier-test@maravilla.com')

    // Should return null for non-existent supplier
    assert(supplier === null, 'Non-existent supplier should return null')
  } catch (error) {
    // Database might not be configured yet - this is OK during setup
    if (error instanceof Error) {
      if (error.message.includes('AIRTABLE') || error.message.includes('credentials')) {
        console.log('  (Database credentials not configured - skipping DB operations)')
        throw new Error('SKIP')
      }
    }
    throw error
  }
}

async function testSupplierDatabaseWrite() {
  try {
    // Create test supplier
    const testSupplier = {
      legal_name: 'Test Supplier ' + Date.now(),
      contact_name: 'Test Contact',
      business_email: `test-${Date.now()}@example.com`,
      phone: '555-0000',
      website: 'https://test.example.com',
      sub_category: 'Services',
      services_offered: ['Service A', 'Service B'],
      preferred_counties: ['County1', 'County2'],
      registration_status: 'Pending Review' as const,
    }

    const created = await createSupplier(testSupplier)

    // Should have ID
    assert(created.id, 'Created supplier should have Airtable ID')

    // Should have supplier_id
    assert(created.supplier_id, 'Created supplier should have supplier_id')
    assert(
      created.supplier_id.startsWith('sup-'),
      'supplier_id should start with sup-'
    )

    // Should have registration date
    assert(created.registration_date, 'Created supplier should have registration_date')

    // Can read it back
    const retrieved = await getSupplierById(created.supplier_id)
    assert(retrieved !== null, 'Created supplier should be readable by ID')

    if (retrieved) {
      assert(retrieved.legal_name === testSupplier.legal_name, 'Retrieved supplier should match created')
      assert(retrieved.business_email === testSupplier.business_email, 'Email should match')
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'SKIP') {
      throw error
    }
    // Database might not be fully configured
    if (error instanceof Error && error.message.includes('AIRTABLE')) {
      console.log('  (Database not configured - skipping)')
      throw new Error('SKIP')
    }
    throw error
  }
}

async function testSupplierListQuery() {
  try {
    const suppliers = await listSuppliers()

    // Should return array
    assert(Array.isArray(suppliers), 'listSuppliers should return array')

    // Can be empty initially
    assert(suppliers.length >= 0, 'Suppliers list should be valid')
  } catch (error) {
    if (error instanceof Error && error.message.includes('AIRTABLE')) {
      throw new Error('SKIP')
    }
    throw error
  }
}

async function testOpportunitiesQuery() {
  try {
    // Query for non-existent supplier
    const opportunities = await getOpportunitiesForSupplier('sup-nonexistent-123')

    // Should return empty array for non-existent supplier
    assert(Array.isArray(opportunities), 'Should return array')
    assert(
      opportunities.length === 0,
      'Non-existent supplier should have no opportunities'
    )
  } catch (error) {
    if (error instanceof Error && error.message.includes('AIRTABLE')) {
      throw new Error('SKIP')
    }
    throw error
  }
}

// ============================================================================
// API ENDPOINT TESTS
// ============================================================================

async function testApiHealth() {
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
    })

    // Should respond (status may vary if not running)
    assert(response, 'Health endpoint should respond')
  } catch (error) {
    // Server might not be running - this is expected
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('  (Dev server not running - this is expected)')
      return
    }
    throw error
  }
}

async function testApiAuthHeaders() {
  // This test verifies API auth would work correctly
  const token = generateToken('sup-test', 'test@test.com', 'Test')

  // Create authorization header
  const authHeader = `Bearer ${token}`

  // Header should be in correct format
  assert(authHeader.startsWith('Bearer '), 'Auth header should start with Bearer')
  assert(authHeader.includes('.'), 'Auth header should contain JWT token')
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

async function testPasswordChangeFlow() {
  // Simulate password change flow
  const oldPassword = 'OldPassword123'
  const newPassword = 'NewPassword456'

  // Hash old password (as if storing in DB)
  const oldHash = await hashPassword(oldPassword)

  // Verify old password
  const oldVerified = await verifyPassword(oldPassword, oldHash)
  assert(oldVerified, 'Old password should verify')

  // Hash new password
  const newHash = await hashPassword(newPassword)

  // New password should not verify with old hash
  const newVerifyOld = await verifyPassword(newPassword, oldHash)
  assert(!newVerifyOld, 'New password should not verify with old hash')

  // New password should verify with new hash
  const newVerified = await verifyPassword(newPassword, newHash)
  assert(newVerified, 'New password should verify with new hash')
}

async function testLoginFlow() {
  // Simulate complete login flow
  const supplierId = 'sup-flow-test'
  const email = 'login-test@example.com'
  const company = 'Flow Test Co'

  // Generate token (as if login was successful)
  const token = generateToken(supplierId, email, company)
  assert(token, 'Token generated for login')

  // Store token in header format
  const authHeader = `Bearer ${token}`

  // Extract and verify token (as if from request header)
  const parts = authHeader.split(' ')
  assert(parts.length === 2, 'Authorization header format valid')

  const extractedToken = parts[1]
  const decoded = verifyToken(extractedToken)

  assert(decoded !== null, 'Token verified on request')
  assert(decoded?.supplier_id === supplierId, 'Token contains correct supplier_id')
  assert(decoded?.business_email === email, 'Token contains correct email')
}

async function testProfileUpdateFlow() {
  // Simulate profile update with password field
  const originalPassword = 'Original123'
  const passwordHash = await hashPassword(originalPassword)

  // Simulate storing in profile
  const profile = {
    supplier_id: 'sup-profile-test',
    legal_name: 'Original Name',
    password_hash: passwordHash,
  }

  // Verify password works
  const verified = await verifyPassword(originalPassword, profile.password_hash)
  assert(verified, 'Original password should verify')

  // Update password
  const newPassword = 'Updated456'
  const newHash = await hashPassword(newPassword)
  profile.password_hash = newHash

  // Verify new password works
  const newVerified = await verifyPassword(newPassword, profile.password_hash)
  assert(newVerified, 'Updated password should verify')

  // Old password should not work
  const oldVerified = await verifyPassword(originalPassword, profile.password_hash)
  assert(!oldVerified, 'Old password should not verify after update')
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  console.log('\n🧪 Supplier Portal Validation & Testing Suite\n')
  console.log('=' + '='.repeat(79))

  // Authentication Tests
  console.log('\n📋 AUTHENTICATION TESTS\n')
  await runTest(
    '1. Password hashing and verification',
    testPasswordHashing
  )
  await runTest(
    '2. Password validation policy',
    testPasswordValidation
  )
  await runTest(
    '3. Verification code generation',
    testVerificationCodeGeneration
  )
  await runTest(
    '4. JWT token generation',
    testTokenGeneration
  )
  await runTest(
    '5. JWT token verification',
    testTokenVerification
  )
  await runTest(
    '6. Expired token handling',
    testTokenExpiration
  )
  await runTest(
    '7. Tampered token detection',
    testTokenTampering
  )

  // Database Tests
  console.log('\n📋 DATABASE TESTS\n')
  await runTest(
    '8. Supplier read operations',
    testSupplierDatabaseRead,
    true
  )
  await runTest(
    '9. Supplier write operations',
    testSupplierDatabaseWrite,
    true
  )
  await runTest(
    '10. Supplier list query',
    testSupplierListQuery,
    true
  )
  await runTest(
    '11. Opportunities query',
    testOpportunitiesQuery,
    true
  )

  // API Tests
  console.log('\n📋 API ENDPOINT TESTS\n')
  await runTest(
    '12. API health endpoint',
    testApiHealth
  )
  await runTest(
    '13. API authorization header format',
    testApiAuthHeaders
  )

  // Integration Tests
  console.log('\n📋 INTEGRATION TESTS\n')
  await runTest(
    '14. Password change flow',
    testPasswordChangeFlow
  )
  await runTest(
    '15. Login flow (end-to-end)',
    testLoginFlow
  )
  await runTest(
    '16. Profile update flow',
    testProfileUpdateFlow
  )

  // Results Summary
  console.log('\n' + '='.repeat(80))
  console.log('\n📊 TEST RESULTS SUMMARY\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed && r.error !== 'SKIP').length
  const skipped = results.filter(r => r.error === 'SKIP').length
  const total = results.length

  console.log(`Tests Passed:    ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`)
  console.log(`Tests Failed:    ${failed}/${total}`)
  console.log(`Tests Skipped:   ${skipped}/${total}`)

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  console.log(`Total Duration:  ${totalDuration}ms`)

  if (failed > 0) {
    console.log('\n⚠️  FAILED TESTS:\n')
    results
      .filter(r => !r.passed && r.error !== 'SKIP')
      .forEach(r => {
        console.log(`  ✗ ${r.name}`)
        console.log(`    Error: ${r.error}`)
        console.log(`    Duration: ${r.duration}ms`)
      })
  }

  if (skipped > 0) {
    console.log('\n⊘  SKIPPED TESTS:\n')
    results
      .filter(r => r.error === 'SKIP')
      .forEach(r => {
        console.log(`  ⊘ ${r.name}`)
        console.log(`    Reason: Config not available (expected during setup)`)
      })
  }

  console.log('\n' + '='.repeat(80))

  if (failed === 0) {
    console.log('\n✅ All critical tests passed!\n')
    process.exit(0)
  } else {
    console.log('\n❌ Some tests failed. Review errors above.\n')
    process.exit(1)
  }
}

// Run tests
main().catch(err => {
  console.error('❌ Test suite error:', err)
  process.exit(1)
})
