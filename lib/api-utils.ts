/**
 * API Response utilities for Mini App endpoints
 * Provides consistent response formatting and error handling
 */

import { NextResponse } from 'next/server'
import type { ApiResponse, ErrorResponse } from './types'

/**
 * Create a success response
 */
export function successResponse<T = any>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string | Error,
  statusCode: number = 400,
  message?: string
): NextResponse<ErrorResponse> {
  const errorMessage = error instanceof Error ? error.message : error

  return NextResponse.json(
    {
      error: errorMessage,
      message: message || errorMessage,
      statusCode,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  )
}

/**
 * Validate required environment variables
 */
export function validateEnvVariables(required: string[]): string[] {
  const missing: string[] = []

  for (const env of required) {
    if (!process.env[env]) {
      missing.push(env)
    }
  }

  return missing
}

/**
 * Handle API errors with proper logging and formatting
 */
export function handleApiError(
  error: unknown,
  context: string
): NextResponse<ErrorResponse> {
  console.error(`[${context}] Error:`, error)

  if (error instanceof SyntaxError) {
    return errorResponse(
      'Invalid request format',
      400,
      error.message
    )
  }

  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('not found')) {
      return errorResponse(error, 404, 'Resource not found')
    }

    if (error.message.includes('unauthorized')) {
      return errorResponse(error, 401, 'Unauthorized')
    }

    if (error.message.includes('forbidden')) {
      return errorResponse(error, 403, 'Forbidden')
    }

    return errorResponse(error, 500, 'Internal server error')
  }

  return errorResponse(
    'An unexpected error occurred',
    500,
    String(error)
  )
}

/**
 * Validate request parameters
 */
export function validateParams(
  params: Record<string, any>,
  required: string[]
): { valid: boolean; missing: string[] } {
  const missing = required.filter(param => !params[param])

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Add CORS headers for Mini App sharing
 */
export function addCorsHeaders(
  response: NextResponse,
  origin?: string
): NextResponse {
  const allowedOrigins = [
    'https://warpcast.com',
    'https://farcaster.xyz',
    'http://localhost:3000',
    'http://localhost:3001',
  ]

  const requestOrigin = origin || '*'
  const isAllowed = allowedOrigins.includes(requestOrigin) || requestOrigin === '*'

  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Farcaster-Context-Token')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  return response
}

/**
 * Verify context token from request headers
 */
export function getContextToken(request: Request): string | null {
  const contextToken = request.headers.get('x-farcaster-context-token')
  if (contextToken) return contextToken

  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    return token || null
  }

  return null
}

/**
 * Rate limiting helper (basic implementation)
 */
const requestCounts = new Map<string, { count: number; reset: number }>()

export function checkRateLimit(
  key: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const data = requestCounts.get(key)

  if (!data || now > data.reset) {
    requestCounts.set(key, {
      count: 1,
      reset: now + windowMs,
    })
    return { allowed: true, remaining: limit - 1 }
  }

  data.count++

  if (data.count > limit) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: limit - data.count }
}

/**
 * Cache response with TTL
 */
const cache = new Map<string, { data: any; expires: number }>()

export function getCachedResponse<T = any>(key: string): T | null {
  const cached = cache.get(key)

  if (!cached) return null
  if (Date.now() > cached.expires) {
    cache.delete(key)
    return null
  }

  return cached.data as T
}

export function cacheResponse<T = any>(
  key: string,
  data: T,
  ttl: number = 300000
): T {
  cache.set(key, {
    data,
    expires: Date.now() + ttl,
  })

  return data
}

/**
 * Clear specific cache entries
 */
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    return
  }

  const regex = new RegExp(pattern)
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key)
    }
  }
}
