// Error handler middleware
import { NextRequest, NextResponse } from 'next/server'

interface ErrorLog {
  timestamp: string
  path: string
  method: string
  statusCode: number
  error: string
  stack?: string
  ip?: string
}

// In-memory error logs (in production, use proper logging service)
export const errorLogs: ErrorLog[] = []

/**
 * Log error to server-side logs (not sent to client)
 */
export function logError(error: ErrorLog) {
  errorLogs.push({
    ...error,
    timestamp: new Date().toISOString(),
  })

  // Keep last 1000 errors in memory
  if (errorLogs.length > 1000) {
    errorLogs.shift()
  }

  // In production, send to logging service (e.g., Sentry, DataDog, CloudWatch)
  console.error(
    `[${error.statusCode}] ${error.method} ${error.path}: ${error.error}`,
    error.stack
  )
}

/**
 * Generic error response - no stack traces exposed to client
 */
export function sendErrorResponse(
  statusCode: number,
  message: string,
  details?: any
): NextResponse {
  // Default messages for different status codes
  const defaultMessages: { [key: number]: string } = {
    400: 'Bad request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not found',
    429: 'Too many requests',
    500: 'Internal server error',
    502: 'Bad gateway',
    503: 'Service unavailable',
  }

  const clientMessage = message || defaultMessages[statusCode] || 'Error'

  // Build response - NEVER include stack trace or sensitive details
  const response: any = {
    error: clientMessage,
  }

  // Only include request ID or correlation ID for debugging (no sensitive data)
  if (details?.requestId) {
    response.requestId = details.requestId
  }

  return NextResponse.json(response, { status: statusCode })
}

/**
 * Wrap API handler with error handling
 */
export function withErrorHandler(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error: any) {
      const pathname = new URL(request.url).pathname
      const method = request.method
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown'

      // Log full error server-side
      logError({
        timestamp: new Date().toISOString(),
        path: pathname,
        method,
        statusCode: error.statusCode || 500,
        error: error.message || 'Unknown error',
        stack: error.stack,
        ip,
      })

      // Send generic error to client
      const statusCode = error.statusCode || 500
      const message =
        statusCode === 500 ? 'Internal server error' : error.message || 'Error'

      return sendErrorResponse(statusCode, message, { requestId: generateRequestId() })
    }
  }
}

/**
 * Generate a request ID for error tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * Format error for response
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Create typed error responses
 */
export const createError = {
  badRequest: (message: string, details?: any) =>
    new APIError(400, message, details),
  unauthorized: (message = 'Unauthorized', details?: any) =>
    new APIError(401, message, details),
  forbidden: (message = 'Forbidden', details?: any) =>
    new APIError(403, message, details),
  notFound: (message = 'Not found', details?: any) =>
    new APIError(404, message, details),
  conflict: (message: string, details?: any) =>
    new APIError(409, message, details),
  internal: (message = 'Internal server error', details?: any) =>
    new APIError(500, message, details),
}
